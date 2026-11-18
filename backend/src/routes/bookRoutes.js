import { Router } from 'express'
import { getBooks, getBook } from '../controllers/bookController.js'

const router = Router()

router.get('/', getBooks)
router.get('/:id', getBook)

export default router