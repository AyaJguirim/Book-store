import api from './api'
import { getToken } from '../utils/tokenStorage'

// Progression de l'utilisateur sur un livre : { last_page, total_pages, ... } ou null
export async function getReadingProgress(bookId, { signal } = {}) {
  const response = await api.get(`/me/reading-progress/${bookId}`, { signal })
  return response.data.data
}

// Enregistre la dernière page lue
export async function saveReadingProgress(bookId, page, totalPages) {
  const response = await api.put(`/me/reading-progress/${bookId}`, { page, totalPages })
  return response.data.data
}

// Historique de lecture : les livres ouverts, du plus récent au plus ancien
export async function getReadingHistory({ signal } = {}) {
  const response = await api.get('/me/reading-progress', { signal })
  return response.data.data
}

export async function removeReadingProgress(bookId) {
  await api.delete(`/me/reading-progress/${bookId}`)
}

// Même enregistrement, mais conçu pour survivre à la fermeture ou au rechargement de l'onglet :
// `keepalive` demande au navigateur de terminer l'envoi même si la page disparaît.
// (Une requête Axios normale serait annulée avec la page.)
export function saveReadingProgressOnExit(bookId, page, totalPages) {
  const token = getToken()
  if (!token) return

  try {
    fetch(`${api.defaults.baseURL}/me/reading-progress/${bookId}`, {
      method: 'PUT',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ page, totalPages }),
    }).catch(() => {})
  } catch {
    // on ignore : au pire, la toute dernière page tournée n'est pas mémorisée
  }
}
