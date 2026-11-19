// backend/src/services/readingLogService.js
import { pool } from '../config/database.js'

// Le journal de CET utilisateur, éventuellement filtré par statut
export async function getReadingLog(userId, status) {
  const result = await pool.query(
    `SELECT b.id, b.title, b.author, b.category_id, c.name AS category,
            b.cover_url, b.cover_path, b.publication_year,
            rl.status,
            to_char(rl.started_at, 'YYYY-MM-DD') AS started_at,
            to_char(rl.finished_at, 'YYYY-MM-DD') AS finished_at,
            rl.updated_at
     FROM reading_log rl
     JOIN books b ON b.id = rl.book_id
     JOIN categories c ON c.id = b.category_id
     WHERE rl.user_id = $1::integer
       AND ($2::text IS NULL OR rl.status = $2::text)
     ORDER BY rl.updated_at DESC`,
    [userId, status],
  )
  return result.rows
}

// L'entrée d'un livre pour CET utilisateur, ou undefined
export async function findReadingEntry(userId, bookId) {
  const result = await pool.query(
    `SELECT book_id, status,
            to_char(started_at, 'YYYY-MM-DD') AS started_at,
            to_char(finished_at, 'YYYY-MM-DD') AS finished_at
     FROM reading_log
     WHERE user_id = $1::integer AND book_id = $2::integer`,
    [userId, bookId],
  )
  return result.rows[0]
}

// Crée l'entrée ou change son statut (une seule ligne par livre)
export async function saveReadingStatus(userId, bookId, status) {
  const result = await pool.query(
    `INSERT INTO reading_log (user_id, book_id, status, started_at, finished_at)
     VALUES ($1::integer, $2::integer, $3::text,
             CASE WHEN $3::text = 'reading' THEN CURRENT_DATE END,
             CASE WHEN $3::text = 'read' THEN CURRENT_DATE END)
     ON CONFLICT (user_id, book_id) DO UPDATE SET
       status = EXCLUDED.status,
       started_at = CASE WHEN EXCLUDED.status = 'reading'
                         THEN COALESCE(reading_log.started_at, CURRENT_DATE)
                         ELSE reading_log.started_at END,
       finished_at = CASE WHEN EXCLUDED.status = 'read'
                          THEN COALESCE(reading_log.finished_at, CURRENT_DATE)
                          ELSE NULL END,
       updated_at = NOW()
     RETURNING book_id, status,
               to_char(started_at, 'YYYY-MM-DD') AS started_at,
               to_char(finished_at, 'YYYY-MM-DD') AS finished_at`,
    [userId, bookId, status],
  )
  return result.rows[0]
}

// Retire un livre du journal de CET utilisateur, retourne le nombre de lignes supprimées
export async function deleteReadingEntry(userId, bookId) {
  const result = await pool.query(
    'DELETE FROM reading_log WHERE user_id = $1::integer AND book_id = $2::integer',
    [userId, bookId],
  )
  return result.rowCount
}