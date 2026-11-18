import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/auth.js'
import { HttpError } from '../utils/HttpError.js'
import { createUser, findUserByEmail, findUserById } from '../services/userService.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BCRYPT_COST = 10
const BAD_CREDENTIALS = 'E-mail ou mot de passe incorrect.'

// Empreinte factice : permet de faire le même calcul quand l'e-mail est inconnu
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', BCRYPT_COST)

function signToken(user) {
  return jwt.sign({ sub: String(user.id) }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRES_IN,
  })
}

// Seules ces informations sortent de l'API (jamais le hash)
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email }
}

function validateRegistration(body) {
  const { name, email, password } = body ?? {}

  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'Le nom, l\'e-mail et le mot de passe sont obligatoires.')
  }

  const cleanName = name.trim().replace(/\s+/g, ' ')
  if (cleanName === '' || cleanName.length > 100) {
    throw new HttpError(400, 'Le nom doit contenir entre 1 et 100 caractères.')
  }

  const cleanEmail = email.trim().toLowerCase()
  if (cleanEmail.length > 254 || !EMAIL_REGEX.test(cleanEmail)) {
    throw new HttpError(400, 'Adresse e-mail invalide.')
  }

  // bcrypt ignore tout ce qui dépasse 72 octets : on refuse plutôt que tronquer en silence
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new HttpError(400, 'Le mot de passe doit contenir au moins 8 caractères (72 octets maximum).')
  }

  return { name: cleanName, email: cleanEmail, password }
}

export async function register(req, res) {
  const { name, email, password } = validateRegistration(req.body)

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST)

  let user
  try {
    user = await createUser({ name, email, passwordHash })
  } catch (error) {
    // 23505 = violation d'unicité PostgreSQL (e-mail déjà utilisé)
    if (error.code === '23505') {
      throw new HttpError(409, 'Cette adresse e-mail est déjà utilisée.')
    }
    throw error
  }

  res.status(201).json({ data: { token: signToken(user), user: publicUser(user) } })
}

export async function login(req, res) {
  const { email, password } = req.body ?? {}

  if (typeof email !== 'string' || typeof password !== 'string' || email.trim() === '' || password === '') {
    throw new HttpError(400, 'L\'e-mail et le mot de passe sont obligatoires.')
  }

  const tooLong = email.length > 254 || Buffer.byteLength(password, 'utf8') > 72
  const user = tooLong ? undefined : await findUserByEmail(email.trim())

  // Même travail et même message, que l'e-mail existe ou non
  const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH)

  if (!user || !passwordOk) {
    throw new HttpError(401, BAD_CREDENTIALS)
  }

  res.json({ data: { token: signToken(user), user: publicUser(user) } })
}

export async function getMe(req, res) {
  const user = await findUserById(req.userId)

  // Jeton valide mais compte supprimé
  if (!user) {
    throw new HttpError(401, 'Session invalide ou expirée. Reconnectez-vous.')
  }

  res.json({ data: { user: publicUser(user) } })
}