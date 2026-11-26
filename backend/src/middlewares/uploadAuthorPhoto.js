import crypto from 'node:crypto'
import multer from 'multer'
import { AUTHORS_DIR, MAX_COVER_SIZE, deleteStoredFile } from '../config/uploads.js'
import { COVER_TYPES, readHead, looksLikeImage } from './uploadBookFiles.js'
import { HttpError } from '../utils/HttpError.js'

// Photo d'un auteur : une seule image (champ "photo"), mêmes règles que les couvertures

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AUTHORS_DIR),
  // Nom aléatoire : jamais le nom d'origine du fichier
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${COVER_TYPES[file.mimetype]}`),
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_COVER_SIZE, files: 1, fields: 10 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'photo' && file.mimetype in COVER_TYPES) return cb(null, true)
    cb(new HttpError(400, 'La photo doit être une image JPG, PNG ou WebP.'))
  },
}).single('photo')

// Supprime la photo déjà écrite sur le disque (en cas d'erreur)
export async function removeUploadedPhoto(file) {
  if (file) await deleteStoredFile(AUTHORS_DIR, file.filename)
}

export function uploadAuthorPhoto(req, res, next) {
  upload(req, res, async (error) => {
    if (error) {
      await removeUploadedPhoto(req.file)
      if (error instanceof multer.MulterError) {
        const tooBig = error.code === 'LIMIT_FILE_SIZE'
        return next(
          new HttpError(
            tooBig ? 413 : 400,
            tooBig ? 'Photo trop volumineuse (5 Mo maximum).' : 'Envoi de la photo invalide.',
          ),
        )
      }
      return next(error)
    }

    try {
      // On vérifie le vrai contenu du fichier, pas seulement le type annoncé
      if (req.file && !looksLikeImage(await readHead(req.file.path, 12))) {
        throw new HttpError(400, 'La photo n\'est pas une image valide.')
      }
      next()
    } catch (validationError) {
      await removeUploadedPhoto(req.file)
      next(validationError)
    }
  })
}
