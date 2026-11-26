import { pool } from '../config/database.js'

export async function getAllCategories() {
  const result = await pool.query('SELECT id, name FROM categories ORDER BY id')
  return result.rows
}

// Cherche une catégorie par son nom, sans tenir compte des majuscules ("roman" = "Roman")
export async function findCategoryByName(name) {
  const result = await pool.query(
    'SELECT id, name FROM categories WHERE lower(name) = lower($1)',
    [name],
  )
  return result.rows[0]
}

export async function createCategory(name) {
  const result = await pool.query(
    'INSERT INTO categories (name) VALUES ($1) RETURNING id, name',
    [name],
  )
  return result.rows[0]
}