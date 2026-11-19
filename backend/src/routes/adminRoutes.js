import { Router } from 'express'
import { requireAuth } from '../middlewares/requireAuth.js'
import { requireAdmin } from '../middlewares/requireAdmin.js'
import { uploadBookFiles } from '../middlewares/uploadBookFiles.js'
import {
  createBookHandler,
  updateBookHandler,
  deleteBookHandler,
} from '../controllers/adminBookController.js'

const router = Router()

// Toutes les routes /api/admin/... exigent une connexion ET le rôle admin
router.use(requireAuth, requireAdmin)

router.post('/books', uploadBookFiles, createBookHandler)
router.put('/books/:id', uploadBookFiles, updateBookHandler)
router.delete('/books/:id', deleteBookHandler)

export default router
