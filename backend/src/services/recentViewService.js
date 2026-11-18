import { pool } from '../config/database.js'

// Enregistre (ou rafraîchit) la consultation d'un livre
export async function recordView(userId, bookId) {
  const result = await pool.query(
    `INSERT INTO recent_views (user_id, book_id)
     VALUES ($1::integer, $2::integer)
     ON CONFLICT (user_id, book_id) DO UPDATE SET viewed_at = NOW()
     RETURNING book_id, viewed_at`,
    [userId, bookId],
  )
  return result.rows[0]
}

// Les livres consultés par CET utilisateur, du plus récent au plus ancien
export async function getRecentViews(userId, limit) {
  const result = await pool.query(
    `SELECT b.id, b.title, b.author, b.category_id, c.name AS category,
            b.cover_url, b.publication_year, rv.viewed_at
     FROM recent_views rv
     JOIN books b ON b.id = rv.book_id
     JOIN categories c ON c.id = b.category_id
     WHERE rv.user_id = $1::integer
     ORDER BY rv.viewed_at DESC
     LIMIT $2::integer`,
    [userId, limit],
  )
  return result.rows
}

// Vide l'historique de CET utilisateur, retourne le nombre de lignes supprimées
export async function clearRecentViews(userId) {
  const result = await pool.query(
    'DELETE FROM recent_views WHERE user_id = $1::integer',
    [userId],
  )
  return result.rowCount
}