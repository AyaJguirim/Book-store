import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Dossier backend/uploads/ (hors du dépôt Git : voir .gitignore)
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const UPLOADS_DIR = path.join(backendDir, 'uploads')
export const PDFS_DIR = path.join(UPLOADS_DIR, 'pdfs') // privé : servi uniquement via l'API, après connexion
export const COVERS_DIR = path.join(UPLOADS_DIR, 'covers') // public : de simples images
export const AUTHORS_DIR = path.join(UPLOADS_DIR, 'authors') // public : photos des auteurs

export const MAX_PDF_SIZE = 100 * 1024 * 1024 // 100 Mo
export const MAX_COVER_SIZE = 5 * 1024 * 1024 // 5 Mo

// Création au démarrage si les dossiers n'existent pas encore
fs.mkdirSync(PDFS_DIR, { recursive: true })
fs.mkdirSync(COVERS_DIR, { recursive: true })
fs.mkdirSync(AUTHORS_DIR, { recursive: true })

// Supprime un fichier uploadé sans jamais faire planter la requête
// (path.basename : on ne sort jamais du dossier prévu)
export async function deleteStoredFile(dir, fileName) {
  if (!fileName) return
  try {
    await fs.promises.unlink(path.join(dir, path.basename(fileName)))
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Suppression de fichier impossible :', error.message)
  }
}
