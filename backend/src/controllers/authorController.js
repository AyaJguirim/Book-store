import { HttpError } from '../utils/HttpError.js'
import { parseId } from '../utils/parseId.js'
import { listAuthors, getAuthorById } from '../services/authorService.js'

// Liste publique des auteurs
export async function getAuthors(req, res) {
  const authors = await listAuthors()
  res.json({ data: authors })
}

// Fiche publique d'un auteur, avec ses livres
export async function getAuthor(req, res) {
  const id = parseId(req.params.id, 'id')
  const author = await getAuthorById(id)
  if (!author) throw new HttpError(404, 'Auteur introuvable.')
  res.json({ data: author })
}
