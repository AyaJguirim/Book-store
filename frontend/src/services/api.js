import axios from 'axios'
import { getToken } from '../utils/tokenStorage'

// Client Axios partagé par tous les services
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
})

// Avant chaque requête : ajoute le jeton de connexion s'il existe
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Permet de reconnaître une requête annulée volontairement (pas une vraie erreur)
export const isCanceled = axios.isCancel

export default api