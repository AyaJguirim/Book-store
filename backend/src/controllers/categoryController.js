import { getAllCategories } from '../services/categoryService.js'

export async function getCategories(req, res) {
  const categories = await getAllCategories()
  res.json({ data: categories })
}