import crypto from 'node:crypto'
import fs from 'node:fs'
import multer from 'multer'
import { PDFS_DIR, COVERS_DIR, MAX_PDF_SIZE, MAX_COVER_SIZE, deleteStoredFile } from '../config/uploads.js'
import { HttpError } from '../utils/HttpError.js'

const COVER_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }

// Nom de fichier aléatoire : jamais le nom d'origine (évite collisions et noms piégés)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, file.fieldname === 'pdf' ? PDFS_DIR : COVERS_DIR),
  filename: (req, file, cb) => {
    const ext = file.fieldname === 'pdf' ? '.pdf' : COVER_TYPES[file.mimetype]
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_PDF_SIZE, files: 2, fields: 10 },
  fileFilter: (req, file, cb) => {
    const ok =
      (file.fieldname === 'pdf' && file.mimetype === 'application/pdf') ||
      (file.fieldname === 'cover' && file.mimetype in COVER_TYPES)
    if (ok) return cb(null, true)

    const message =
      file.fieldname === 'pdf'
        ? 'Le livre doit être un fichier PDF.'
        : file.fieldname === 'cover'
          ? 'La couverture doit être une image JPG, PNG ou WebP.'
          : 'Champ de fichier inattendu.'
    cb(new HttpError(400, message))
  },
}).fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
])

// Lit les premiers octets d'un fichier (vérifie le vrai contenu, pas seulement le type annoncé)
async function readHead(filePath, length) {
  const handle = await fs.promises.open(filePath, 'r')
  try {
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, 0)
    return buffer
  } finally {
    await handle.close()
  }
}

function looksLikeImage(head) {
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  const isPng = head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  const isWebp = head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP'
  return isJpeg || isPng || isWebp
}

// Supprime les fichiers déjà écrits sur le disque par multer (en cas d'erreur)
export async function removeUploadedFiles(files) {
  await deleteStoredFile(PDFS_DIR, files?.pdf?.[0]?.filename)
  await deleteStoredFile(COVERS_DIR, files?.cover?.[0]?.filename)
}

// Middleware : reçoit un formulaire multipart (champs texte + fichiers "pdf" et "cover")
export function uploadBookFiles(req, res, next) {
  upload(req, res, async (error) => {
    if (error) {
      await removeUploadedFiles(req.files)
      if (error instanceof multer.MulterError) {
        const tooBig = error.code === 'LIMIT_FILE_SIZE'
        return next(
          new HttpError(
            tooBig ? 413 : 400,
            tooBig ? 'Fichier trop volumineux (PDF : 100 Mo maximum, couverture : 5 Mo).' : 'Envoi de fichiers invalide.',
          ),
        )
      }
      return next(error)
    }

    try {
      const pdf = req.files?.pdf?.[0]
      const cover = req.files?.cover?.[0]

      if (pdf && !(await readHead(pdf.path, 5)).toString('latin1').startsWith('%PDF-')) {
        throw new HttpError(400, 'Le fichier envoyé n\'est pas un PDF valide.')
      }
      if (cover) {
        if (cover.size > MAX_COVER_SIZE) throw new HttpError(413, 'Couverture trop volumineuse (5 Mo maximum).')
        if (!looksLikeImage(await readHead(cover.path, 12))) {
          throw new HttpError(400, 'La couverture n\'est pas une image valide.')
        }
      }
      next()
    } catch (validationError) {
      await removeUploadedFiles(req.files)
      next(validationError)
    }
  })
}
