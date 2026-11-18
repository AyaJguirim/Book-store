import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

// Le pool lit ses paramètres dans les variables d'environnement (.env)
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

// Évite qu'une connexion inactive qui tombe fasse planter tout le serveur
pool.on('error', (error) => {
  console.error('Erreur inattendue sur une connexion PostgreSQL :', error.message)
})