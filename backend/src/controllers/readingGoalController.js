// backend/src/controllers/readingGoalController.js
import { HttpError } from '../utils/HttpError.js'
import { getGoal, saveGoal, deleteGoal } from '../services/readingGoalService.js'

const MIN_YEAR = 2000
const MAX_YEAR = 2100
const MAX_TARGET = 1000

// Convertit le texte de l'URL en année valide (quatre chiffres) ou lance une erreur 400
function parseYear(value) {
  const year = typeof value === 'string' && /^\d{4}$/.test(value) ? Number(value) : NaN
  if (!(year >= MIN_YEAR && year <= MAX_YEAR)) {
    throw new HttpError(400, `L'année doit être comprise entre ${MIN_YEAR} et ${MAX_YEAR}.`)
  }
  return year
}

function parseTarget(value) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_TARGET) {
    throw new HttpError(400, `L'objectif doit être un entier entre 1 et ${MAX_TARGET}.`)
  }
  return value
}

export async function getReadingGoal(req, res) {
  const year = parseYear(req.params.year)
  const goal = await getGoal(req.userId, year)
  res.json({ data: goal })
}

export async function putReadingGoal(req, res) {
  const year = parseYear(req.params.year)
  const target = parseTarget(req.body?.target)

  try {
    await saveGoal(req.userId, year, target)
  } catch (error) {
    // 23503 = clé étrangère violée : le compte n'existe plus
    if (error.code === '23503' && error.constraint === 'reading_goals_user_id_fkey') {
      throw new HttpError(401, 'Session invalide ou expirée. Reconnectez-vous.')
    }
    throw error
  }

  const goal = await getGoal(req.userId, year)
  res.json({ data: goal })
}

export async function removeReadingGoal(req, res) {
  const year = parseYear(req.params.year)
  const deleted = await deleteGoal(req.userId, year)
  res.json({ data: { deleted } })
}