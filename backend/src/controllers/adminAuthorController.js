import { HttpError } from '../utils/HttpError.js'
import { parseId } from '../utils/parseId.js'
import { AUTHORS_DIR, deleteStoredFile } from '../config/uploads.js'
import { removeUploadedPhoto } from '../middlewares/uploadAuthorPhoto.js'
import {
  createAuthor,
  updateAuthor,
  deleteAuthor,
  getAuthorById,
  getAuthorPhotoPath,
  findAuthorByName,
} from '../services/authorService.js'

// Texte optionnel : vide -> null, trop long -> erreur
function optionalText(body, name, label, maxLength, existingValue) {
  if (body[name] === undefined) return existingValue ?? null
  // Les formulaires multipart envoient les retours à la ligne en \r\n : on garde un simple \n
  const text = typeof body[name] === 'string' ? body[name].replace(/\r\n?/g, '\n').trim() : ''
  if (text.length > maxLength) {
    throw new HttpError(400, `${label} : ${maxLength} caractères maximum.`)
  }
  return text === '' ? null : text
}

// Date optionnelle au format AAAA-MM-JJ (celui du champ date d'un formulaire)
function optionalDate(body, name, label, existingValue) {
  if (body[name] === undefined) return existingValue ?? null
  const raw = typeof body[name] === 'string' ? body[name].trim() : ''
  if (raw === '') return null

  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(raw) &&
    new Date(`${raw}T00:00:00Z`).toISOString().slice(0, 10) === raw
  if (!valid) throw new HttpError(400, `${label} : date invalide (format AAAA-MM-JJ).`)
  return raw
}

// Lit et valide les champs. `existing` (modification) : un champ absent garde son ancienne valeur.
function readFields(body, existing) {
  const has = (name) => body[name] !== undefined

  const name = has('name')
    ? (typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '')
    : existing?.name
  if (!name || name.length > 150) {
    throw new HttpError(400, 'Le nom de l\'auteur est obligatoire (150 caractères maximum).')
  }

  const birthDate = optionalDate(body, 'birth_date', 'Date de naissance', existing?.birth_date)
  const deathDate = optionalDate(body, 'death_date', 'Date de décès', existing?.death_date)
  if (birthDate && deathDate && deathDate < birthDate) {
    throw new HttpError(400, 'La date de décès ne peut pas précéder la date de naissance.')
  }

  return {
    name,
    biography: optionalText(body, 'biography', 'Biographie', 10000, existing?.biography),
    birthDate,
    deathDate,
    birthPlace: optionalText(body, 'birth_place', 'Lieu de naissance', 150, existing?.birth_place),
    nationality: optionalText(body, 'nationality', 'Nationalité', 100, existing?.nationality),
  }
}

// 23505 : un auteur porte déjà ce nom (deux ajouts en même temps) ; 23514 : contrôle de dates
function translateError(error) {
  if (error.code === '23505') return new HttpError(409, 'Un auteur porte déjà ce nom.')
  if (error.code === '23514') return new HttpError(400, 'Les dates de l\'auteur sont incohérentes.')
  return error
}

export async function createAuthorHandler(req, res) {
  try {
    const fields = readFields(req.body ?? {}, null)
    if (await findAuthorByName(fields.name)) {
      throw new HttpError(409, 'Un auteur porte déjà ce nom.')
    }

    const id = await createAuthor({ ...fields, photoPath: req.file?.filename ?? null })
    res.status(201).json({ data: await getAuthorById(id) })
  } catch (error) {
    await removeUploadedPhoto(req.file) // rien ne reste sur le disque si la création échoue
    throw translateError(error)
  }
}

export async function updateAuthorHandler(req, res) {
  const id = parseId(req.params.id, 'id')
  const body = req.body ?? {}

  try {
    const existing = await getAuthorById(id)
    if (!existing) throw new HttpError(404, 'Auteur introuvable.')
    const { photo_path: oldPhoto } = await getAuthorPhotoPath(id)

    const fields = readFields(body, existing)
    if (await findAuthorByName(fields.name, id)) {
      throw new HttpError(409, 'Un auteur porte déjà ce nom.')
    }

    // Nouvelle photo -> remplace l'ancienne. Case « supprimer la photo » -> plus de photo.
    const removePhoto = body.remove_photo === 'true'
    const photoPath = req.file ? req.file.filename : removePhoto ? null : oldPhoto

    const found = await updateAuthor(id, { ...fields, photoPath })
    if (!found) throw new HttpError(404, 'Auteur introuvable.')

    // La base est à jour : on peut effacer l'ancienne photo remplacée
    if (req.file || removePhoto) await deleteStoredFile(AUTHORS_DIR, oldPhoto)

    res.json({ data: await getAuthorById(id) })
  } catch (error) {
    await removeUploadedPhoto(req.file)
    throw translateError(error)
  }
}

export async function deleteAuthorHandler(req, res) {
  const id = parseId(req.params.id, 'id')

  const deleted = await deleteAuthor(id)
  if (!deleted) throw new HttpError(404, 'Auteur introuvable.')

  await deleteStoredFile(AUTHORS_DIR, deleted.photo_path)
  res.json({ data: { deleted: 1 } })
}
