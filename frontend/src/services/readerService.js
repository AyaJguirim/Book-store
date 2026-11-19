import api from './api'

// Télécharge le PDF d'un livre (connexion obligatoire) et le retourne en ArrayBuffer.
// Le délai par défaut d'Axios (10 s) est trop court pour un gros livre : on l'allonge.
export async function getBookPdf(bookId, { signal, onProgress } = {}) {
  try {
    const response = await api.get(`/books/${bookId}/pdf`, {
      responseType: 'arraybuffer',
      timeout: 120000,
      signal,
      onDownloadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100))
      },
    })
    return response.data
  } catch (error) {
    // En cas d'erreur, le corps de la réponse arrive aussi en binaire : on le relit en JSON
    // pour que getErrorMessage puisse afficher le message de l'API.
    if (error.response?.data instanceof ArrayBuffer) {
      try {
        error.response.data = JSON.parse(new TextDecoder().decode(error.response.data))
      } catch {
        error.response.data = null
      }
    }
    throw error
  }
}
