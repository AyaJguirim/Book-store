import { HttpError } from '../utils/HttpError.js'
import { parseId } from '../utils/parseId.js'
import {
  recordView,
  getRecentViews,
  clearRecentViews,
} from '../services/recentViewService.js'

const RECENT_LIMIT = 10

export async function listRecentViews(req, res) {
  const books = await getRecentViews(req.userId, RECENT_LIMIT)
  res.json({ data: books })
}

export async function addRecentView(req, res) {
  const bookId = parseId(req.params.bookId, 'bookId')

  let view
  try {
    view = await recordView(req.userId, bookId)
  } catch (error) {
    // 23503 = clé étrangère violée : le livre (ou le compte) n'existe pas
    if (error.code === '23503' && error.constraint === 'recent_views_book_id_fkey') {
      throw new HttpError(404, 'Livre introuvable.')
    }
    if (error.code === '23503' && error.constraint === 'recent_views_user_id_fkey') {
      throw new HttpError(401, 'Session invalide ou expirée. Reconnectez-vous.')
    }
    throw error
  }

  res.json({ data: view })
}

export async function removeRecentViews(req, res) {
  const deleted = await clearRecentViews(req.userId)
  res.json({ data: { deleted } })
}
