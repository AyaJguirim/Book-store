import { HttpError } from '../utils/HttpError.js'
import { parseId } from '../utils/parseId.js'
import {
  findProgress,
  saveProgress,
  listProgress,
  removeProgress,
} from '../services/readingProgressService.js'

const MAX_PAGES = 100000

function isPageNumber(value) {
  return Number.isInteger(value) && value >= 1 && value <= MAX_PAGES
}

export async function listReadingProgress(req, res) {
  const books = await listProgress(req.userId)
  res.json({ data: books })
}

// Retourne la progression, ou null si l'utilisateur n'a jamais ouvert ce livre
export async function getReadingProgress(req, res) {
  const bookId = parseId(req.params.bookId, 'bookId')
  const progress = await findProgress(req.userId, bookId)
  res.json({ data: progress ?? null })
}

export async function putReadingProgress(req, res) {
  const bookId = parseId(req.params.bookId, 'bookId')
  const { page, totalPages } = req.body ?? {}

  if (!isPageNumber(page)) {
    throw new HttpError(400, `page doit être un entier entre 1 et ${MAX_PAGES}.`)
  }
  if (totalPages !== undefined && totalPages !== null) {
    if (!isPageNumber(totalPages) || page > totalPages) {
      throw new HttpError(400, 'totalPages doit être un entier supérieur ou égal à page.')
    }
  }

  let progress
  try {
    progress = await saveProgress(req.userId, bookId, page, totalPages ?? null)
  } catch (error) {
    // 23503 = clé étrangère violée : le livre (ou le compte) n'existe pas
    if (error.code === '23503' && error.constraint === 'reading_progress_book_id_fkey') {
      throw new HttpError(404, 'Livre introuvable.')
    }
    if (error.code === '23503' && error.constraint === 'reading_progress_user_id_fkey') {
      throw new HttpError(401, 'Session invalide ou expirée. Reconnectez-vous.')
    }
    throw error
  }

  res.json({ data: progress })
}

export async function deleteReadingProgress(req, res) {
  const bookId = parseId(req.params.bookId, 'bookId')
  const deleted = await removeProgress(req.userId, bookId)
  res.json({ data: { deleted } })
}
