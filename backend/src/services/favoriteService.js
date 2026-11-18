// backend/src/services/favoriteService.js
import { pool } from '../config/database.js'

// Les identifiants des livres favoris de CET utilisateur
export async function getFavoriteIds(userId) {
  const result = await pool.query(
    `SELECT book_id
     FROM favorites
     WHERE user_id = $1::integer
     ORDER BY created_at, book_id`,
    [userId],
  )
  return result.rows.map((row) => row.book_id)
}

// Ajoute un favori (sans erreur s'il existe déjà)
export async function addFavorite(userId, bookId) {
  await pool.query(
    `INSERT INTO favorites (user_id, book_id)
     VALUES ($1::integer, $2::integer)
     ON CONFLICT (user_id, book_id) DO NOTHING`,
    [userId, bookId],
  )
}

// Retire un favori de CET utilisateur, retourne le nombre de lignes supprimées
export async function removeFavorite(userId, bookId) {
  const result = await pool.query(
    'DELETE FROM favorites WHERE user_id = $1::integer AND book_id = $2::integer',
    [userId, bookId],
  )
  return result.rowCount
}

// Ajoute plusieurs favoris d'un coup : les ids qui ne correspondent
// à aucun livre sont ignorés, les doublons aussi
export async function importFavorites(userId, bookIds) {
  await pool.query(
    `INSERT INTO favorites (user_id, book_id)
     SELECT $1::integer, b.id
     FROM books b
     WHERE b.id = ANY($2::integer[])
     ON CONFLICT (user_id, book_id) DO NOTHING`,
    [userId, bookIds],
  )
}