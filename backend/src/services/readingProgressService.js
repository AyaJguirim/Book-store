import { pool } from '../config/database.js'

// La progression de CET utilisateur sur un livre, ou undefined
export async function findProgress(userId, bookId) {
  const result = await pool.query(
    `SELECT book_id, last_page, total_pages, updated_at
     FROM reading_progress
     WHERE user_id = $1::integer AND book_id = $2::integer`,
    [userId, bookId],
  )
  return result.rows[0]
}

// Enregistre la dernière page lue (une seule ligne par livre).
// Si le nombre total de pages n'est pas fourni, on garde l'ancien.
export async function saveProgress(userId, bookId, lastPage, totalPages) {
  const result = await pool.query(
    `INSERT INTO reading_progress (user_id, book_id, last_page, total_pages)
     VALUES ($1::integer, $2::integer, $3::integer, $4::integer)
     ON CONFLICT (user_id, book_id) DO UPDATE
       SET last_page = EXCLUDED.last_page,
           total_pages = COALESCE(EXCLUDED.total_pages, reading_progress.total_pages),
           updated_at = NOW()
     RETURNING book_id, last_page, total_pages, updated_at`,
    [userId, bookId, lastPage, totalPages],
  )
  return result.rows[0]
}

// L'historique de lecture de CET utilisateur, du plus récent au plus ancien
export async function listProgress(userId) {
  const result = await pool.query(
    `SELECT b.id, b.title, b.author, b.category_id, c.name AS category,
            b.cover_url, b.cover_path, b.publication_year,
            (b.pdf_path IS NOT NULL) AS has_pdf,
            rp.last_page, rp.total_pages, rp.updated_at
     FROM reading_progress rp
     JOIN books b ON b.id = rp.book_id
     JOIN categories c ON c.id = b.category_id
     WHERE rp.user_id = $1::integer
     ORDER BY rp.updated_at DESC`,
    [userId],
  )
  return result.rows
}

// Retire un livre de l'historique, retourne le nombre de lignes supprimées
export async function removeProgress(userId, bookId) {
  const result = await pool.query(
    'DELETE FROM reading_progress WHERE user_id = $1::integer AND book_id = $2::integer',
    [userId, bookId],
  )
  return result.rowCount
}
