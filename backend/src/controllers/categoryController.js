import { HttpError } from '../utils/HttpError.js'
import {
  getAllCategories,
  findCategoryByName,
  createCategory,
} from '../services/categoryService.js'

export async function getCategories(req, res) {
  const categories = await getAllCategories()
  res.json({ data: categories })
}

// Administrateur : ajoute une nouvelle catégorie
export async function createCategoryHandler(req, res) {
  const raw = req.body?.name
  const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : ''

  if (name === '' || name.length > 100) {
    throw new HttpError(400, 'Le nom de la catégorie est obligatoire (100 caractères maximum).')
  }
  if (await findCategoryByName(name)) {
    throw new HttpError(409, 'Cette catégorie existe déjà.')
  }

  let category
  try {
    category = await createCategory(name)
  } catch (error) {
    // 23505 = nom déjà pris (deux ajouts en même temps)
    if (error.code === '23505') throw new HttpError(409, 'Cette catégorie existe déjà.')
    throw error
  }

  res.status(201).json({ data: category })
}