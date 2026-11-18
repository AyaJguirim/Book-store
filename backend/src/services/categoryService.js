import { pool } from '../config/database.js'

export async function getAllCategories() {
  const result = await pool.query('SELECT id, name FROM categories ORDER BY id')
  return result.rows
}