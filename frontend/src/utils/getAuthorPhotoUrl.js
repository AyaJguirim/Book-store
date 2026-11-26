// frontend/src/utils/getAuthorPhotoUrl.js
export const DEFAULT_AUTHOR_PHOTO = '/authors/default.svg'

// Adresse du serveur API sans le suffixe /api (les photos sont servies par le backend)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')

// La photo est enregistrée par le backend (backend/uploads/authors) : son nom est dans authors.photo_path.
// Un auteur sans photo affiche l'image par défaut.
export function getAuthorPhotoUrl(author) {
  if (author.photo_path) return `${API_ORIGIN}/uploads/authors/${author.photo_path}`
  return DEFAULT_AUTHOR_PHOTO
}
