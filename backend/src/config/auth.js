import 'dotenv/config'

const secret = process.env.JWT_SECRET

// Le serveur refuse de démarrer sans secret solide
if (!secret || secret.length < 32) {
  throw new Error(
    'JWT_SECRET manquant ou trop court (32 caractères minimum) dans backend/.env',
  )
}

export const JWT_SECRET = secret
export const JWT_EXPIRES_IN = '7d'