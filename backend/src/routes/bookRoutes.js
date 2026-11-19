import { Router } from 'express'
import { getBooks, getBook, getBookPdf } from '../controllers/bookController.js'
import { requireAuth } from '../middlewares/requireAuth.js'

const router = Router()

router.get('/', getBooks)
router.get('/:id', getBook)
// Lecture du PDF : connexion obligatoire
router.get('/:id/pdf', requireAuth, getBookPdf)

export default router