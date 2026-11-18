import api from './api'

// Liste des livres, avec recherche et catégorie facultatives
// signal : permet d'annuler la requête (AbortController)
export async function getBooks({ search = '', categoryId = null, signal } = {}) {
  const params = {}
  if (search.trim() !== '') params.search = search.trim()
  if (categoryId !== null) params.categoryId = categoryId

  const response = await api.get('/books', { params, signal })
  return response.data.data
}

// Un livre par identifiant
export async function getBookById(id, { signal } = {}) {
  const response = await api.get(`/books/${id}`, { signal })
  return response.data.data
}