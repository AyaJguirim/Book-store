// frontend/src/services/authService.js
import api from './api'

// Retourne { token, user }
export async function register({ name, email, password }) {
  const response = await api.post('/auth/register', { name, email, password })
  return response.data.data
}

// Retourne { token, user }
export async function login({ email, password }) {
  const response = await api.post('/auth/login', { email, password })
  return response.data.data
}

// Retourne l'utilisateur désigné par le jeton
export async function getMe() {
  const response = await api.get('/auth/me')
  return response.data.data.user
}