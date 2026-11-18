// backend/src/controllers/favoriteController.js
import { HttpError } from '../utils/HttpError.js'
import { parseId } from '../utils/parseId.js'
import {
  getFavoriteIds,
  addFavorite,
  removeFavorite,
  importFavorites,
} from '../services/favoriteService.js'

const MAX_ID = 2147483647 // plus grand entier accepté par PostgreSQL (INTEGER)
const MAX_IMPORT = 500

// Transforme les erreurs de clé étrangère en réponses claires
function translateForeignKeyError(error) {
  if (error.code === '23503' && error.constraint === 'favorites_book_id_fkey') {
    return new HttpError(404, 'Livre introuvable.')
  }
  if (error.code === '23503' && error.constraint === 'favorites_user_id_fkey') {
    return new HttpError(401, 'Session invalide ou expirée. Reconnectez-vous.')
  }
  return error
}

export async function listFavorites(req, res) {
  const ids = await getFavoriteIds(req.userId)
  res.json({ data: ids })
}

export async function putFavorite(req, res) {
  const bookId = parseId(req.params.bookId, 'bookId')

  try {
    await addFavorite(req.userId, bookId)
  } catch (error) {
    throw translateForeignKeyError(error)
  }

  res.json({ data: { bookId } })
}

export async function deleteFavorite(req, res) {
  const bookId = parseId(req.params.bookId, 'bookId')
  const deleted = await removeFavorite(req.userId, bookId)
  res.json({ data: { deleted } })
}

export async function importLocalFavorites(req, res) {
  const bookIds = req.body?.bookIds

  const isValid =
    Array.isArray(bookIds) &&
    bookIds.length <= MAX_IMPORT &&
    bookIds.every((id) => Number.isInteger(id) && id >= 1 && id <= MAX_ID)

  if (!isValid) {
    throw new HttpError(
      400,
      `bookIds doit être un tableau d'au plus ${MAX_IMPORT} identifiants entiers positifs.`,
    )
  }

  try {
    await importFavorites(req.userId, bookIds)
  } catch (error) {
    throw translateForeignKeyError(error)
  }

  const ids = await getFavoriteIds(req.userId)
  res.json({ data: ids })
}
