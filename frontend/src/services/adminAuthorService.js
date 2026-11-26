import api from './api'

// Administrateur. Un FormData permet d'envoyer du texte ET la photo ;
// Axios ajoute lui-même l'en-tête multipart.
export async function createAuthor(formData) {
  const response = await api.post('/admin/authors', formData, { timeout: 60000 })
  return response.data.data
}

export async function updateAuthor(id, formData) {
  const response = await api.put(`/admin/authors/${id}`, formData, { timeout: 60000 })
  return response.data.data
}

export async function deleteAuthor(id) {
  await api.delete(`/admin/authors/${id}`)
}
