// Exécuté quand aucune route ne correspond à l'URL demandée
export function notFound(req, res) {
  res.status(404).json({
    error: { message: `Route introuvable : ${req.method} ${req.originalUrl}` },
  })
}