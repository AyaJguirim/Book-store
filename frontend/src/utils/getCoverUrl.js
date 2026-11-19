// frontend/src/utils/getCoverUrl.js
export const DEFAULT_COVER = '/covers/default.svg'

// Adresse du serveur API sans le suffixe /api (les couvertures importées y sont servies)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')

// 1) Livre ajouté par l'administrateur avec une couverture importée -> image du serveur
// 2) Sinon, méthode d'origine : le fichier /<id>.jpg du dossier public
//    (livre n° 6 -> frontend/public/6.jpg). Si l'image n'existe pas, BookCard affiche DEFAULT_COVER.
export function getCoverUrl(book) {
  if (book.cover_path) return `${API_ORIGIN}/uploads/covers/${book.cover_path}`
  return `/${book.id}.jpg`
}
