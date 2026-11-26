import api from './api'

// Liste publique des auteurs
export async function getAuthors({ signal } = {}) {
  const response = await api.get('/authors', { signal })
  return response.data.data
}

// Fiche d'un auteur, avec ses livres (author.books)
export async function getAuthorById(id, { signal } = {}) {
  const response = await api.get(`/authors/${id}`, { signal })
  return response.data.data
}
