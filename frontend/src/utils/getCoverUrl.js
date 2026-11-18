// frontend/src/utils/getCoverUrl.js
export const DEFAULT_COVER = '/covers/default.svg'

// Méthode du prof : la couverture est le fichier /<id>.jpg du dossier public
// (livre n° 6 -> frontend/public/6.jpg). Pour changer de méthode plus tard,
// il suffit de modifier cette seule ligne.
export function getCoverUrl(book) {
  return `/${book.id}.jpg`
}