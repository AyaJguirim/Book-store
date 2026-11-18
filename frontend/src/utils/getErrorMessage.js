export function getErrorMessage(error) {
  // L'API a répondu, mais avec un code d'erreur
  if (error.response) {
    if (error.response.status >= 500) {
      return 'Le serveur a rencontré un problème. Réessayez dans un instant.'
    }
    return error.response.data?.error?.message || 'La requête a échoué.'
  }

  // Aucune réponse : délai dépassé ou serveur injoignable
  if (error.code === 'ECONNABORTED') {
    return 'Le serveur met trop de temps à répondre. Réessayez dans un instant.'
  }
  return 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.'
}