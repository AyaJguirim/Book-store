// backend/src/controllers/readingLogController.js
import { HttpError } from '../utils/HttpError.js'
import { parseId } from '../utils/parseId.js'
import {
  getReadingLog,
  findReadingEntry,
  saveReadingStatus,
  deleteReadingEntry,
} from '../services/readingLogService.js'

const READING_STATUSES = ['reading', 'want_to_read', 'read', 'abandoned']

function parseStatus(value) {
  if (typeof value !== 'string' || !READING_STATUSES.includes(value)) {
    throw new HttpError(
      400,
      `Le statut doit être l'un des suivants : ${READING_STATUSES.join(', ')}.`,
    )
  }
  return value
}

export async function listReadingLog(req, res) {
  const { status } = req.query
  // Paramètre absent ou vide : pas de filtre
  const cleanStatus = status === undefined || status === '' ? null : parseStatus(status)

  const entries = await getReadingLog(req.userId, cleanStatus)
  res.json({ data: entries })
}

export async function getReadingEntry(req, res) {
  const bookId = parseId(req.params.bookId, 'bookId')
  const entry = await findReadingEntry(req.userId, bookId)

  // Pas d'entrée : ce n'est pas une erreur, le livre n'est simplement pas dans le journal
  res.json({ data: entry ?? null })
}

export async function putReadingEntry(req, res) {
  const bookId = parseId(req.params.bookId, 'bookId')
  const status = parseStatus(req.body?.status)

  let entry
  try {
    entry = await saveReadingStatus(req.userId, bookId, status)
  } catch (error) {
    // 23503 = clé étrangère violée : le livre (ou le compte) n'existe pas
    if (error.code === '23503' && error.constraint === 'reading_log_book_id_fkey') {
      throw new HttpError(404, 'Livre introuvable.')
    }
    if (error.code === '23503' && error.constraint === 'reading_log_user_id_fkey') {
      throw new HttpError(401, 'Session invalide ou expirée. Reconnectez-vous.')
    }
    throw error
  }

  res.json({ data: entry })
}

export async function removeReadingEntry(req, res) {
  const bookId = parseId(req.params.bookId, 'bookId')
  const deleted = await deleteReadingEntry(req.userId, bookId)
  res.json({ data: { deleted } })
}