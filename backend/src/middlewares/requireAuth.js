import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/auth.js'
import { HttpError } from '../utils/HttpError.js'

// Protège une route : exige un jeton valide et place l'id dans req.userId
export function requireAuth(req, res, next) {
  const header = req.headers.authorization

  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentification requise.')
  }

  let userId
  try {
    // algorithms : on n'accepte que HS256 (refuse notamment les jetons "alg: none")
    const payload = jwt.verify(header.slice(7).trim(), JWT_SECRET, {
      algorithms: ['HS256'],
    })
    userId = Number(payload.sub)
  } catch {
    throw new HttpError(401, 'Session invalide ou expirée. Reconnectez-vous.')
  }

  if (!Number.isInteger(userId) || userId < 1) {
    throw new HttpError(401, 'Session invalide ou expirée. Reconnectez-vous.')
  }

  req.userId = userId
  next()
}