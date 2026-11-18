// frontend/src/services/favoriteService.js
import api from './api'

// Les identifiants des livres favoris du compte connecté
export async function getFavoriteIds({ signal } = {}) {
  const response = await api.get('/me/favorites', { signal })
  return response.data.data
}

export async function addFavorite(bookId) {
  await api.put(`/me/favorites/${bookId}`)
}

export async function removeFavorite(bookId) {
  await api.delete(`/me/favorites/${bookId}`)
}

// Copie les favoris du visiteur dans le compte ; retourne la liste complète du compte
export async function importFavorites(bookIds) {
  const response = await api.post('/me/favorites/import', { bookIds })
  return response.data.data
}