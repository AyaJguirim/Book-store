import { pool } from '../config/database.js'

// search : texte (ou '') / categoryId : nombre (ou null)
export async function getAllBooks({ search = '', categoryId = null } = {}) {
  // Espaces superflus retirés ; une recherche vide devient NULL (= pas de filtre)
  const cleanSearch = search.trim().replace(/\s+/g, ' ')
  const searchParam = cleanSearch === '' ? null : cleanSearch

  const result = await pool.query(
    `SELECT b.id, b.title, b.author, b.category_id, c.name AS category,
            b.cover_url, b.cover_path, (b.pdf_path IS NOT NULL) AS has_pdf,
            b.publication_year
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
            b.description, b.cover_url, b.cover_path,
            (b.pdf_path IS NOT NULL) AS has_pdf, b.publication_year
     FROM books b
     JOIN categories c ON c.id = b.category_id
     WHERE b.id = $1::integer`,
    [id],
  )

  return result.rows[0]
}

// ----- Gestion des livres (administrateur) -----

// Les noms de fichiers d'un livre (jamais renvoyés par l'API publique)
export async function getBookFiles(id) {
  const result = await pool.query(
    'SELECT pdf_path, cover_path FROM books WHERE id = $1::integer',
    [id],
  )
  return result.rows[0]
}

// fields : title, author, categoryId, description, publicationYear, pdfPath, coverPath
export async function createBook(fields) {
  const result = await pool.query(
    `INSERT INTO books (title, author, category_id, description, publication_year, pdf_path, cover_path)
     VALUES ($1, $2, $3::integer, $4, $5::integer, $6, $7)
     RETURNING id`,
    [
      fields.title,
      fields.author,
      fields.categoryId,
      fields.description,
      fields.publicationYear,
      fields.pdfPath,
      fields.coverPath,
    ],
  )
  return result.rows[0].id
}

// Remplace tous les champs (le contrôleur a déjà fusionné anciennes et nouvelles valeurs)
// Retourne true si le livre existe
export async function updateBook(id, fields) {
  const result = await pool.query(
    `UPDATE books
     SET title = $2, author = $3, category_id = $4::integer, description = $5,
         publication_year = $6::integer, pdf_path = $7, cover_path = $8
     WHERE id = $1::integer`,
    [
      id,
      fields.title,
      fields.author,
      fields.categoryId,
      fields.description,
      fields.publicationYear,
      fields.pdfPath,
      fields.coverPath,
    ],
  )
  return result.rowCount > 0
}

// Supprime le livre (favoris, notes, progression... partent en cascade)
// Retourne ses fichiers pour qu'on les efface du disque, ou undefined s'il n'existe pas
export async function deleteBook(id) {
  const result = await pool.query(
    'DELETE FROM books WHERE id = $1::integer RETURNING pdf_path, cover_path',
    [id],
  )
  return result.rows[0]
}
