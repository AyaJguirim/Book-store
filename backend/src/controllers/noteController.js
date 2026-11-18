// backend/src/controllers/noteController.js
import { HttpError } from '../utils/HttpError.js'
import { parseId } from '../utils/parseId.js'
import { getNotes, findNote, saveNote, deleteNote } from '../services/noteService.js'

const MAX_CONTENT_LENGTH = 2000

// Absent ou null : pas d'étoiles. Sinon un entier de 1 à 5
function parseRating(value) {
  if (value === undefined || value === null) return null
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new HttpError(400, 'La note doit être un entier entre 1 et 5.')
  }
  return value
}

// Absent, null ou vide : pas de commentaire. Sinon un texte nettoyé
function parseContent(value) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Le commentaire doit être un texte.')
  }
  const clean = value.trim()
  if (clean.length > MAX_CONTENT_LENGTH) {
    throw new HttpError(
      400,
      `Le commentaire ne peut pas dépasser ${MAX_CONTENT_LENGTH} caractères.`,
    )
  }
  return clean === '' ? null : clean
}

// Transforme les erreurs de clé étrangère en réponses claires
function translateForeignKeyError(error) {
  if (error.code === '23503' && error.constraint === 'notes_book_id_fkey') {
    return new HttpError(404, 'Livre introuvable.')
  }
  if (error.code === '23503' && error.constraint === 'notes_user_id_fkey') {
    return new HttpError(401, 'Session invalide ou expirée. Reconnectez-vous.')
  }
  return error
}

export async function listNotes(req, res) {
  const notes = await getNotes(req.userId)
  res.json({ data: notes })
}

export async function getNote(req, res) {
  const bookId = parseId(req.params.bookId, 'bookId')
  const note = await findNote(req.userId, bookId)

  // Pas de note : ce n'est pas une erreur, le livre n'est simplement pas noté
  res.json({ data: note ?? null })
}

export async function putNote(req, res) {
  const bookId = parseId(req.params.bookId, 'bookId')
  const body = req.body ?? {}

  const rating = parseRating(body.rating)
  const content = parseContent(body.content)

  if (rating === null && content === null) {
    throw new HttpError(400, 'Ajoutez une note en étoiles ou un commentaire.')
  }

  let note
  try {
    note = await saveNote(req.userId, bookId, rating, content)
  } catch (error) {
    throw translateForeignKeyError(error)
  }

  res.json({ data: note })
}

export async function removeNote(req, res) {
  const bookId = parseId(req.params.bookId, 'bookId')
  const deleted = await deleteNote(req.userId, bookId)
  res.json({ data: { deleted } })
}