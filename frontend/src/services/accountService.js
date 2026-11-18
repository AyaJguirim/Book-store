// frontend/src/services/accountService.js
import api from './api'

// ----- Livres consultés récemment -----

export async function getRecentViews({ signal } = {}) {
  const response = await api.get('/me/recent-views', { signal })
  return response.data.data
}

export async function recordView(bookId) {
  await api.put(`/me/recent-views/${bookId}`)
}

export async function clearRecentViews() {
  await api.delete('/me/recent-views')
}

// ----- Journal de lecture -----

// Tout le journal : chaque livre avec son statut
export async function getReadingLog({ signal } = {}) {
  const response = await api.get('/me/reading-log', { signal })
  return response.data.data
}

// L'entrée d'un livre, ou null s'il n'est pas dans le journal
export async function getReadingEntry(bookId, { signal } = {}) {
  const response = await api.get(`/me/reading-log/${bookId}`, { signal })
  return response.data.data
}

export async function setReadingStatus(bookId, status) {
  const response = await api.put(`/me/reading-log/${bookId}`, { status })
  return response.data.data
}

export async function removeReadingEntry(bookId) {
  await api.delete(`/me/reading-log/${bookId}`)
}