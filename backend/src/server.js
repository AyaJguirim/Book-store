import { pool } from './config/database.js'
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bookRoutes from './routes/bookRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import { notFound } from './middlewares/notFound.js'
import { errorHandler } from './middlewares/errorHandler.js'
import authRoutes from './routes/authRoutes.js'
import meRoutes from './routes/meRoutes.js'

const app = express()
const PORT = process.env.PORT || 3000

// Middlewares : exécutés avant les routes, pour chaque requête
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())

// Route de test pour vérifier que l'API répond
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Book Store opérationnelle' })
})

// Vérifie que l'API peut interroger PostgreSQL
app.get('/api/health/db', async (req, res) => {
  const result = await pool.query('SELECT NOW() AS now')
  res.json({ status: 'ok', databaseTime: result.rows[0].now })
})
// Routes de l'API : le préfixe /api/... est défini ici, une seule fois
app.use('/api/books', bookRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/me', meRoutes)
// Toujours en DERNIER, dans cet ordre
app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`API Book Store démarrée sur http://localhost:${PORT}`)
})