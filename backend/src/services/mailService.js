import nodemailer from 'nodemailer'
import { MAIL_FROM, SMTP_CONFIG } from '../config/mail.js'

// Créé une seule fois au démarrage (null si aucun SMTP n'est configuré)
const transporter = SMTP_CONFIG ? nodemailer.createTransport(SMTP_CONFIG) : null

// Le nom vient de l'utilisateur : on neutralise tout HTML qu'il pourrait y avoir mis
function escapeHtml(text) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return text.replace(/[&<>"']/g, (character) => entities[character])
}

export async function sendPasswordResetEmail({ to, name, resetUrl, validMinutes }) {
  // Pas de SMTP configuré
  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP non configuré (SMTP_HOST manquant dans backend/.env)')
    }
    // En développement : on affiche le lien dans le terminal, c'est suffisant pour tester
    console.log(`\n[Mot de passe oublié] Lien de réinitialisation pour ${to} :\n${resetUrl}\n`)
    return
  }

  const text =
    `Bonjour ${name},\n\n` +
    `Vous avez demandé à réinitialiser votre mot de passe Book Store.\n` +
    `Cliquez sur ce lien pour en choisir un nouveau :\n${resetUrl}\n\n` +
    `Ce lien est valable ${validMinutes} minutes et ne peut servir qu'une seule fois.\n` +
    `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.\n`

  const html =
    `<p>Bonjour ${escapeHtml(name)},</p>` +
    `<p>Vous avez demandé à réinitialiser votre mot de passe Book Store.</p>` +
    `<p><a href="${resetUrl}">Choisir un nouveau mot de passe</a></p>` +
    `<p>Ce lien est valable ${validMinutes} minutes et ne peut servir qu'une seule fois.</p>` +
    `<p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.</p>`

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: 'Réinitialisation de votre mot de passe – Book Store',
    text,
    html,
  })
}