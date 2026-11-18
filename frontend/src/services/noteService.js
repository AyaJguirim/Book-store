// frontend/src/services/noteService.js
import api from './api'

// Toutes les notes du compte connecté (avec les informations du livre)
export async function getNotes({ signal } = {}) {
  const response = await api.get('/me/notes', { signal })
  return response.data.data
}

// La note d'un livre, ou null s'il n'est pas noté
export async function getNote(bookId, { signal } = {}) {
  const response = await api.get(`/me/notes/${bookId}`, { signal })
  return response.data.data
}

// rating : 1 à 5 ou null / content : texte ou null (au moins l'un des deux)
export async function saveNote(bookId, { rating, content }) {
  const response = await api.put(`/me/notes/${bookId}`, { rating, content })
  return response.data.data
}

export async function deleteNote(bookId) {
  await api.delete(`/me/notes/${bookId}`)
}