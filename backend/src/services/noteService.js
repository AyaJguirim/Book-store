// backend/src/services/noteService.js
import { pool } from '../config/database.js'

// Les notes de CET utilisateur, avec les informations du livre, la plus récente d'abord
export async function getNotes(userId) {
  const result = await pool.query(
    `SELECT b.id, b.title, b.author, b.category_id, c.name AS category,
            b.cover_url, b.publication_year,
            n.rating, n.content, n.created_at, n.updated_at
     FROM notes n
     JOIN books b ON b.id = n.book_id
     JOIN categories c ON c.id = b.category_id
     WHERE n.user_id = $1::integer
     ORDER BY n.updated_at DESC`,
    [userId],
  )
  return result.rows
}

// La note de CET utilisateur sur un livre, ou undefined
export async function findNote(userId, bookId) {
  const result = await pool.query(
    `SELECT book_id, rating, content, created_at, updated_at
     FROM notes
     WHERE user_id = $1::integer AND book_id = $2::integer`,
    [userId, bookId],
  )
  return result.rows[0]
}

// Crée la note ou la remplace (une seule ligne par livre et par compte)
export async function saveNote(userId, bookId, rating, content) {
  const result = await pool.query(
    `INSERT INTO notes (user_id, book_id, rating, content)
     VALUES ($1::integer, $2::integer, $3::smallint, $4::text)
     ON CONFLICT (user_id, book_id) DO UPDATE SET
       rating = EXCLUDED.rating,
       content = EXCLUDED.content,
       updated_at = NOW()
     RETURNING book_id, rating, content, created_at, updated_at`,
    [userId, bookId, rating, content],
  )
  return result.rows[0]
}

// Supprime la note de CET utilisateur, retourne le nombre de lignes supprimées
export async function deleteNote(userId, bookId) {
  const result = await pool.query(
    'DELETE FROM notes WHERE user_id = $1::integer AND book_id = $2::integer',
    [userId, bookId],
  )
  return result.rowCount
}