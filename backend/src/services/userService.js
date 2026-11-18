import { pool } from '../config/database.js'

export async function createUser({ name, email, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash],
  )
  return result.rows[0]
}

// Retourne l'utilisateur (avec son hash) ou undefined
export async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, name, email, password_hash, created_at
     FROM users
     WHERE lower(email) = lower($1)`,
    [email],
  )
  return result.rows[0]
}

export async function findUserById(id) {
  const result = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1::integer',
    [id],
  )
  return result.rows[0]
}