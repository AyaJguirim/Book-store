import { HttpError } from '../utils/HttpError.js'
import { parseId } from '../utils/parseId.js'
import { PDFS_DIR, COVERS_DIR, deleteStoredFile } from '../config/uploads.js'
import { removeUploadedFiles } from '../middlewares/uploadBookFiles.js'
import { createBook, updateBook, deleteBook, getBookById, getBookFiles } from '../services/bookService.js'

// Nettoie un champ texte : espaces superflus retirés
function cleanText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

// Lit et valide les champs du formulaire. `existing` (modification) : un champ absent garde son ancienne valeur.
function readFields(body, existing) {
  const has = (name) => body[name] !== undefined

  const title = has('title') ? cleanText(body.title) : existing?.title
  if (!title || title.length > 200) {
    throw new HttpError(400, 'Le titre est obligatoire (200 caractères maximum).')
  }

  const author = has('author') ? cleanText(body.author) : existing?.author
  if (!author || author.length > 150) {
    throw new HttpError(400, 'L\'auteur est obligatoire (150 caractères maximum).')
  }

  let categoryId = existing?.category_id
  if (has('category_id')) {
    if (typeof body.category_id !== 'string' || !/^[1-9]\d{0,9}$/.test(body.category_id) || Number(body.category_id) > 2147483647) {
      throw new HttpError(400, 'La catégorie est obligatoire.')
    }
    categoryId = Number(body.category_id)
  }
  if (!categoryId) throw new HttpError(400, 'La catégorie est obligatoire.')

  let description = existing ? existing.description : null
  if (has('description')) {
    const text = typeof body.description === 'string' ? body.description.trim() : ''
    if (text.length > 5000) throw new HttpError(400, 'La description est limitée à 5000 caractères.')
    description = text === '' ? null : text
  }

  let publicationYear = existing ? existing.publication_year : null
  if (has('publication_year')) {
    const raw = typeof body.publication_year === 'string' ? body.publication_year.trim() : ''
    if (raw === '') {
      publicationYear = null
    } else if (!/^\d{1,4}$/.test(raw) || Number(raw) < 1 || Number(raw) > 2100) {
      throw new HttpError(400, 'L\'année de publication doit être comprise entre 1 et 2100.')
    } else {
      publicationYear = Number(raw)
    }
  }

  return { title, author, categoryId, description, publicationYear }
}

// 23503 = clé étrangère violée : la catégorie n'existe pas
function translateError(error) {
  if (error.code === '23503' && error.constraint === 'books_category_id_fkey') {
    return new HttpError(400, 'Catégorie introuvable.')
  }
  return error
}

export async function createBookHandler(req, res) {
  const pdf = req.files?.pdf?.[0]
  const cover = req.files?.cover?.[0]

  try {
    const fields = readFields(req.body ?? {}, null)
    const id = await createBook({
      ...fields,
      pdfPath: pdf?.filename ?? null,
      coverPath: cover?.filename ?? null,
    })
    res.status(201).json({ data: await getBookById(id) })
  } catch (error) {
    await removeUploadedFiles(req.files) // rien ne reste sur le disque si la création échoue
    throw translateError(error)
  }
}

export async function updateBookHandler(req, res) {
  const id = parseId(req.params.id, 'id')
  const body = req.body ?? {}
  const pdf = req.files?.pdf?.[0]
  const cover = req.files?.cover?.[0]

  try {
    const existing = await getBookById(id)
    if (!existing) throw new HttpError(404, 'Livre introuvable.')
    const oldFiles = await getBookFiles(id)

    const fields = readFields(body, existing)

    // Nouveau fichier -> remplace l'ancien. Case "supprimer la couverture" -> plus de couverture.
    const removeCover = body.remove_cover === 'true'
    const pdfPath = pdf ? pdf.filename : oldFiles.pdf_path
    const coverPath = cover ? cover.filename : removeCover ? null : oldFiles.cover_path

    const found = await updateBook(id, { ...fields, pdfPath, coverPath })
    if (!found) throw new HttpError(404, 'Livre introuvable.')

    // La base est à jour : on peut effacer les anciens fichiers remplacés
    if (pdf) await deleteStoredFile(PDFS_DIR, oldFiles.pdf_path)
    if (cover || removeCover) await deleteStoredFile(COVERS_DIR, oldFiles.cover_path)

    res.json({ data: await getBookById(id) })
  } catch (error) {
    await removeUploadedFiles(req.files)
    throw translateError(error)
  }
}

export async function deleteBookHandler(req, res) {
  const id = parseId(req.params.id, 'id')

  const files = await deleteBook(id)
  if (!files) throw new HttpError(404, 'Livre introuvable.')

  await deleteStoredFile(PDFS_DIR, files.pdf_path)
  await deleteStoredFile(COVERS_DIR, files.cover_path)

  res.json({ data: { deleted: 1 } })
}
