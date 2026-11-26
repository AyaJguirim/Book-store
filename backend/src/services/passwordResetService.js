import crypto from 'node:crypto'
import { pool } from '../config/database.js'

export const RESET_TOKEN_MINUTES = 60 // durée de validité du lien
const COOLDOWN_SECONDS = 60 // délai minimum entre deux demandes pour un même compte

// Le jeton envoyé par e-mail n'est JAMAIS stocké : on ne garde que son empreinte SHA-256.
// (Un jeton aléatoire de 256 bits n'a pas besoin de bcrypt : SHA-256 suffit et reste rapide.)
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Une demande a-t-elle déjà été faite il y a moins d'une minute ? (évite de spammer une boîte mail)
export async function hasRecentRequest(userId) {
  const result = await pool.query(
    `SELECT 1 FROM password_resets
     WHERE user_id = $1::integer
       AND created_at > NOW() - make_interval(secs => $2::integer)`,
    [userId, COOLDOWN_SECONDS],
  )
  return result.rowCount > 0
}

// Crée un jeton pour cet utilisateur et retourne sa valeur (à mettre dans le lien de l'e-mail)
export async function createResetToken(userId) {
  const token = crypto.randomBytes(32).toString('hex') // 64 caractères, imprévisible

  // Une nouvelle demande annule les précédentes ; on en profite pour nettoyer les jetons expirés
  await pool.query('DELETE FROM password_resets WHERE user_id = $1::integer OR expires_at < NOW()', [userId])
  await pool.query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES ($1::integer, $2, NOW() + make_interval(mins => $3::integer))`,
    [userId, hashToken(token), RESET_TOKEN_MINUTES],
  )
  return token
}

// Utilise le jeton ET change le mot de passe en une seule requête atomique :
// si deux personnes envoient le même lien en même temps, une seule réussit.
// Retourne true si le mot de passe a été changé, false si le jeton est inconnu, expiré ou déjà utilisé.
export async function consumeResetToken(token, passwordHash) {
  const result = await pool.query(
    `WITH claimed AS (
       UPDATE password_resets
       SET used_at = NOW()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       RETURNING user_id
     )
     UPDATE users SET password_hash = $2
     WHERE id IN (SELECT user_id FROM claimed)
     RETURNING id`,
    [hashToken(token), passwordHash],
  )
  if (result.rowCount === 0) return false

  // Le mot de passe a changé : toutes les demandes de ce compte deviennent inutiles
  await pool.query('DELETE FROM password_resets WHERE user_id = $1::integer', [result.rows[0].id])
  return true
}