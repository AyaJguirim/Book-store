import { HttpError } from './HttpError.js'

const MAX_ID = 2147483647 // plus grand entier accepté par PostgreSQL (INTEGER)

// Convertit un texte en identifiant valide (entier > 0) ou lance une erreur 400
export function parseId(value, fieldName) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > MAX_ID) {
    throw new HttpError(400, `Le paramètre ${fieldName} doit être un entier positif.`)
  }
  return Number(value)
}