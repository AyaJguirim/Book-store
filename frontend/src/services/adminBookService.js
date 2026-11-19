import api from './api'

// Un envoi de PDF peut être long : pas de délai maximum côté client.
// Axios ajoute lui-même l'en-tête multipart quand on lui donne un FormData.
const UPLOAD_OPTIONS = (onProgress) => ({
  timeout: 0,
  onUploadProgress: (event) => {
    if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100))
  },
})

export async function createBook(formData, { onProgress } = {}) {
  const response = await api.post('/admin/books', formData, UPLOAD_OPTIONS(onProgress))
  return response.data.data
}

export async function updateBook(id, formData, { onProgress } = {}) {
  const response = await api.put(`/admin/books/${id}`, formData, UPLOAD_OPTIONS(onProgress))
  return response.data.data
}

export async function deleteBook(id) {
  await api.delete(`/admin/books/${id}`)
}
