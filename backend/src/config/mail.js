import 'dotenv/config'

// Adresse du site (le frontend) : sert à construire le lien envoyé par e-mail.
// Elle vient TOUJOURS de .env, jamais de la requête (sinon un pirate pourrait y glisser son adresse).
export const FRONTEND_URL = (
  process.env.FRONTEND_URL ||
  process.env.CORS_ORIGIN ||
  'http://localhost:5173'
).replace(/\/+$/, '')

// Expéditeur affiché dans l'e-mail
export const MAIL_FROM = process.env.MAIL_FROM || 'Book Store <no-reply@bookstore.local>'

// Serveur SMTP (celui qui envoie réellement les e-mails).
// Si SMTP_HOST est vide : aucun e-mail n'est envoyé, le lien s'affiche dans le terminal du backend.
export const SMTP_CONFIG = process.env.SMTP_HOST
  ? {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      // Port 465 : connexion chiffrée d'emblée. Port 587 : chiffrement négocié (STARTTLS).
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    }
  : null