import { getAllBooks, getBookById } from '../services/bookService.js'
import { HttpError } from '../utils/HttpError.js'

const MAX_SEARCH_LENGTH = 100
const MAX_ID = 2147483647 // plus grand entier accepté par PostgreSQL (type INTEGER)

// Convertit un texte en identifiant valide (entier > 0) ou lance une erreur 400
function parseId(value, fieldName) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > MAX_ID) {
    throw new HttpError(400, `Le paramètre ${fieldName} doit être un entier positif.`)
  }
  return Number(value)
}

export async function getBooks(req, res) {
  const { search, categoryId } = req.query

  // Paramètre absent ou vide : on l'ignore
  let cleanSearch = ''
  if (search !== undefined && search !== '') {
    if (typeof search !== 'string' || search.length > MAX_SEARCH_LENGTH) {
      throw new HttpError(400, `Le paramètre search doit être un texte de ${MAX_SEARCH_LENGTH} caractères maximum.`)
    }
    cleanSearch = search
  }

  let cleanCategoryId = null
  if (categoryId !== undefined && categoryId !== '') {
    cleanCategoryId = parseId(categoryId, 'categoryId')
  }

  const books = await getAllBooks({ search: cleanSearch, categoryId: cleanCategoryId })
  res.json({ data: books })
}

export async function getBook(req, res) {
  const id = parseId(req.params.id, 'id')

  const book = await getBookById(id)
  if (!book) {
    throw new HttpError(404, 'Livre introuvable.')
  }

  res.json({ data: book })
}