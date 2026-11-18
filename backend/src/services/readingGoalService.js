// backend/src/services/readingGoalService.js
import { pool } from '../config/database.js'

// L'objectif de CET utilisateur pour une année, avec sa progression.
// target vaut null s'il n'a pas défini d'objectif cette année-là.
export async function getGoal(userId, year) {
  const result = await pool.query(
    `SELECT $2::integer AS year,
            (SELECT target
             FROM reading_goals
             WHERE user_id = $1::integer AND year = $2::integer) AS target,
            (SELECT COUNT(*)::integer
             FROM reading_log
             WHERE user_id = $1::integer
               AND status = 'read'
               AND finished_at >= make_date($2::integer, 1, 1)
               AND finished_at <  make_date($2::integer + 1, 1, 1)) AS read_count`,
    [userId, year],
  )

  const row = result.rows[0]
  return { year: row.year, target: row.target, read: row.read_count }
}

// Crée l'objectif ou le remplace (un seul par année et par compte)
export async function saveGoal(userId, year, target) {
  await pool.query(
    `INSERT INTO reading_goals (user_id, year, target)
     VALUES ($1::integer, $2::integer, $3::integer)
     ON CONFLICT (user_id, year) DO UPDATE SET target = EXCLUDED.target`,
    [userId, year, target],
  )
}

// Supprime l'objectif de CET utilisateur, retourne le nombre de lignes supprimées
export async function deleteGoal(userId, year) {
  const result = await pool.query(
    'DELETE FROM reading_goals WHERE user_id = $1::integer AND year = $2::integer',
    [userId, year],
  )
  return result.rowCount
}