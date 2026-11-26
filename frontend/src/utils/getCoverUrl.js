// frontend/src/utils/getCoverUrl.js
export const DEFAULT_COVER = '/covers/default.svg'

// Adresse du serveur API sans le suffixe /api (les couvertures sont servies par le backend)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')

// Les couvertures sont enregistrées par le backend (backend/uploads/covers) et leur nom est
// dans books.cover_path. Un livre sans couverture affiche l'image par défaut.
export function getCoverUrl(book) {
  if (book.cover_path) return `${API_ORIGIN}/uploads/covers/${book.cover_path}`
  return DEFAULT_COVER
}
