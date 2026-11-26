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
// Demande un e-mail de réinitialisation. Retourne le message à afficher (le même, que le compte existe ou non)
export async function forgotPassword(email) {
  const response = await api.post('/auth/forgot-password', { email })
  return response.data.data.message
}

// Enregistre le nouveau mot de passe grâce au jeton reçu par e-mail. Retourne le message de succès
export async function resetPassword({ token, password }) {
  const response = await api.post('/auth/reset-password', { token, password })
  return response.data.data.message
}