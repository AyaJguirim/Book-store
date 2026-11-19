import { findUserById } from '../services/userService.js'
import { HttpError } from '../utils/HttpError.js'

// À placer APRÈS requireAuth : réserve la route aux administrateurs.
// Le rôle est relu dans la base à chaque requête (jamais lu dans le jeton),
// donc retirer le rôle admin prend effet immédiatement.
export async function requireAdmin(req, res, next) {
  const user = await findUserById(req.userId)

  if (!user) {
    throw new HttpError(401, 'Session invalide ou expirée. Reconnectez-vous.')
  }
  if (user.role !== 'admin') {
    throw new HttpError(403, 'Accès réservé à l\'administrateur.')
  }

  next()
}
