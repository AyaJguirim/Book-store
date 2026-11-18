// frontend/src/services/statsService.js
import api from './api'

// Retourne { year, readTotal, readYear, averageRating, ratedCount, topCategories, monthly }
export async function getStats(year, { signal } = {}) {
  const response = await api.get('/me/stats', { params: { year }, signal })
  return response.data.data
}