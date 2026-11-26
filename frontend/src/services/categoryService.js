import api from './api'

export async function getCategories({ signal } = {}) {
  const response = await api.get('/categories', { signal })
  return response.data.data
}

// Administrateur : crée une catégorie, retourne { id, name }
export async function createCategory(name) {
  const response = await api.post('/admin/categories', { name })
  return response.data.data
}