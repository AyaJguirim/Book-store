import { Router } from 'express'
import { requireAuth } from '../middlewares/requireAuth.js'
import { requireAdmin } from '../middlewares/requireAdmin.js'
import { uploadBookFiles } from '../middlewares/uploadBookFiles.js'
import { uploadAuthorPhoto } from '../middlewares/uploadAuthorPhoto.js'
import { createCategoryHandler } from '../controllers/categoryController.js'
import {
  createAuthorHandler,
  updateAuthorHandler,
  deleteAuthorHandler,
} from '../controllers/adminAuthorController.js'
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

router.post('/categories', createCategoryHandler)

router.post('/authors', uploadAuthorPhoto, createAuthorHandler)
router.put('/authors/:id', uploadAuthorPhoto, updateAuthorHandler)
router.delete('/authors/:id', deleteAuthorHandler)

export default router
