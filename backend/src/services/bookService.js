import { pool } from '../config/database.js'

// search : texte (ou '') / categoryId : nombre (ou null)
export async function getAllBooks({ search = '', categoryId = null } = {}) {
  // Espaces superflus retirés ; une recherche vide devient NULL (= pas de filtre)
  const cleanSearch = search.trim().replace(/\s+/g, ' ')
  const searchParam = cleanSearch === '' ? null : cleanSearch

  const result = await pool.query(
    `SELECT b.id, b.title, b.author, b.category_id, c.name AS category,
            b.cover_url, b.publication_year
     FROM books b
     JOIN categories c ON c.id = b.category_id
     WHERE ($1::text IS NULL
            OR position(unaccent(lower($1::text)) IN unaccent(lower(b.title))) > 0)
       AND ($2::integer IS NULL OR b.category_id = $2::integer)
     ORDER BY b.id`,
    [searchParam, categoryId],
  )

  return result.rows
}

// Retourne le livre ou undefined s'il n'existe pas
export async function getBookById(id) {
  const result = await pool.query(
    `SELECT b.id, b.title, b.author, b.category_id, c.name AS category,
            b.description, b.cover_url, b.publication_year
     FROM books b
     JOIN categories c ON c.id = b.category_id
     WHERE b.id = $1::integer`,
    [id],
  )

  return result.rows[0]
}