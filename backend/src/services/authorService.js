import { pool } from '../config/database.js'

// Dates renvoyées en texte "AAAA-MM-JJ" (évite les décalages de fuseau horaire des objets Date)
const DATES = `to_char(a.birth_date, 'YYYY-MM-DD') AS birth_date,
               to_char(a.death_date, 'YYYY-MM-DD') AS death_date`

// Un livre appartient à un auteur quand books.author = authors.name,
// sans tenir compte des majuscules, des accents ni des espaces autour
const SAME_NAME = 'unaccent(lower(trim(b.author))) = unaccent(lower(trim(a.name)))'

// Liste publique : une carte par auteur
export async function listAuthors() {
  const result = await pool.query(
    `SELECT a.id, a.name, a.nationality, a.photo_path, ${DATES},
            (SELECT count(*)::int FROM books b WHERE ${SAME_NAME}) AS books_count
     FROM authors a
     ORDER BY unaccent(lower(a.name)), a.id`,
  )
  return result.rows
}

// Fiche complète + ses livres (même format que le catalogue, pour réutiliser BookGrid)
// Retourne undefined si l'auteur n'existe pas
export async function getAuthorById(id) {
  const result = await pool.query(
    `SELECT a.id, a.name, a.biography, a.birth_place, a.nationality, a.photo_path, ${DATES}
     FROM authors a
     WHERE a.id = $1::integer`,
    [id],
  )
  const author = result.rows[0]
  if (!author) return undefined

  const works = await pool.query(
    `SELECT b.id, b.title, b.author, b.category_id, c.name AS category,
            b.cover_url, b.cover_path, (b.pdf_path IS NOT NULL) AS has_pdf,
            b.publication_year
     FROM books b
     JOIN categories c ON c.id = b.category_id
     WHERE unaccent(lower(trim(b.author))) = unaccent(lower(trim($1::text)))
     ORDER BY b.publication_year NULLS LAST, b.title`,
    [author.name],
  )

  return { ...author, books: works.rows }
}

// Y a-t-il déjà un auteur de ce nom ? (excludeId : on ignore l'auteur qu'on est en train de modifier)
export async function findAuthorByName(name, excludeId = null) {
  const result = await pool.query(
    `SELECT id FROM authors
     WHERE unaccent(lower(trim(name))) = unaccent(lower(trim($1::text)))
       AND ($2::integer IS NULL OR id <> $2::integer)`,
    [name, excludeId],
  )
  return result.rows[0]
}

// Le nom du fichier photo d'un auteur (jamais renvoyé tel quel par l'API publique)
export async function getAuthorPhotoPath(id) {
  const result = await pool.query('SELECT photo_path FROM authors WHERE id = $1::integer', [id])
  return result.rows[0]
}

// fields : name, biography, birthDate, deathDate, birthPlace, nationality, photoPath
export async function createAuthor(fields) {
  const result = await pool.query(
    `INSERT INTO authors (name, biography, birth_date, death_date, birth_place, nationality, photo_path)
     VALUES ($1, $2, $3::date, $4::date, $5, $6, $7)
     RETURNING id`,
    [
      fields.name,
      fields.biography,
      fields.birthDate,
      fields.deathDate,
      fields.birthPlace,
      fields.nationality,
      fields.photoPath,
    ],
  )
  return result.rows[0].id
}

// Remplace tous les champs (le contrôleur a déjà fusionné anciennes et nouvelles valeurs)
// Retourne true si l'auteur existe
export async function updateAuthor(id, fields) {
  const result = await pool.query(
    `UPDATE authors
     SET name = $2, biography = $3, birth_date = $4::date, death_date = $5::date,
         birth_place = $6, nationality = $7, photo_path = $8
     WHERE id = $1::integer`,
    [
      id,
      fields.name,
      fields.biography,
      fields.birthDate,
      fields.deathDate,
      fields.birthPlace,
      fields.nationality,
      fields.photoPath,
    ],
  )
  return result.rowCount > 0
}

// Supprime la fiche (les livres ne sont PAS touchés). Retourne le nom de la photo, ou undefined
export async function deleteAuthor(id) {
  const result = await pool.query(
    'DELETE FROM authors WHERE id = $1::integer RETURNING photo_path',
    [id],
  )
  return result.rows[0]
}
