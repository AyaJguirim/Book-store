// backend/src/routes/meRoutes.js
import { Router } from 'express'
import { getMyStats } from "../controllers/statsController.js";
import { requireAuth } from '../middlewares/requireAuth.js'
import {
  listRecentViews,
  addRecentView,
  removeRecentViews,
} from '../controllers/recentViewController.js'
import {
  listReadingLog,
  getReadingEntry,
  putReadingEntry,
  removeReadingEntry,
} from '../controllers/readingLogController.js'
import {
  listFavorites,
  putFavorite,
  deleteFavorite,
  importLocalFavorites,
} from '../controllers/favoriteController.js'
import {
  listReadingProgress,
  getReadingProgress,
  putReadingProgress,
  deleteReadingProgress,
} from '../controllers/readingProgressController.js'
import { listNotes, getNote, putNote, removeNote } from '../controllers/noteController.js'
import {
  getReadingGoal,
  putReadingGoal,
  removeReadingGoal,
} from '../controllers/readingGoalController.js'

const router = Router()

// Toutes les routes /api/me/... exigent une connexion
router.use(requireAuth)
router.get("/stats", getMyStats);

router.get('/recent-views', listRecentViews)
router.put('/recent-views/:bookId', addRecentView)
router.delete('/recent-views', removeRecentViews)

router.get('/reading-log', listReadingLog)
router.get('/reading-log/:bookId', getReadingEntry)
router.put('/reading-log/:bookId', putReadingEntry)
router.delete('/reading-log/:bookId', removeReadingEntry)

router.get('/reading-progress', listReadingProgress)
router.get('/reading-progress/:bookId', getReadingProgress)
router.put('/reading-progress/:bookId', putReadingProgress)
router.delete('/reading-progress/:bookId', deleteReadingProgress)

router.get('/favorites', listFavorites)
router.post('/favorites/import', importLocalFavorites)
router.put('/favorites/:bookId', putFavorite)
router.delete('/favorites/:bookId', deleteFavorite)

router.get('/notes', listNotes)
router.get('/notes/:bookId', getNote)
router.put('/notes/:bookId', putNote)
router.delete('/notes/:bookId', removeNote)

router.get('/reading-goals/:year', getReadingGoal)
router.put('/reading-goals/:year', putReadingGoal)
router.delete('/reading-goals/:year', removeReadingGoal)

export default router