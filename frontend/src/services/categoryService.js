import api from './api'

export async function getCategories({ signal } = {}) {
  const response = await api.get('/categories', { signal })
  return response.data.data
}