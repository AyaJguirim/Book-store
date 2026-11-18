// Gestion centralisée des erreurs : 4 paramètres, c'est ce qui l'identifie comme middleware d'erreur
export function errorHandler(err, req, res, next) {
  // JSON invalide envoyé par le client
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { message: 'Corps de requête JSON invalide.' },
    })
  }

  const status = err.status || 500

  // Le détail complet reste dans le terminal du serveur
  console.error(`[Erreur ${status}]`, err)

  // Pour une erreur serveur, on n'expose jamais le message réel au client
  const message =
    status >= 500 ? 'Erreur interne du serveur.' : err.message

  res.status(status).json({ error: { message } })
}