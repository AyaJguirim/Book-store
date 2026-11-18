// frontend/src/services/readingGoalService.js
import api from './api'

// Retourne { year, target (ou null), read }
export async function getReadingGoal(year, { signal } = {}) {
  const response = await api.get(`/me/reading-goals/${year}`, { signal })
  return response.data.data
}

// Crée ou modifie l'objectif ; retourne { year, target, read }
export async function saveReadingGoal(year, target) {
  const response = await api.put(`/me/reading-goals/${year}`, { target })
  return response.data.data
}

export async function deleteReadingGoal(year) {
  await api.delete(`/me/reading-goals/${year}`)
}