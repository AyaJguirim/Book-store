// backend/src/services/statsService.js
// À ADAPTER (1/3) : copie à l'identique la ligne qui importe le pool PostgreSQL
// en haut de backend/src/services/readingGoalService.js
import { pool } from "../config/database.js";
// Statistiques de lecture d'un utilisateur pour une année
export async function getReadingStats(userId, year) {
  const [summary, ratings, categories, months] = await Promise.all([
    // Livres lus : total et pour l'année
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'read')::int AS read_total,
         COUNT(*) FILTER (
           WHERE status = 'read'
             AND finished_at >= make_date($2::int, 1, 1)
             AND finished_at <  make_date($2::int + 1, 1, 1)
         )::int AS read_year
       FROM reading_log
       WHERE user_id = $1`,
      [userId, year],
    ),

    // Note moyenne (une décimale) et nombre de livres notés avec étoiles
    pool.query(
      `SELECT
         ROUND(AVG(rating)::numeric, 1)::float8 AS average_rating,
         COUNT(rating)::int AS rated_count
       FROM notes
       WHERE user_id = $1`,
      [userId],
    ),

    // Les 3 catégories où l'on a lu le plus de livres
    pool.query(
      `SELECT c.name, COUNT(*)::int AS read_count
       FROM reading_log rl
       JOIN books b ON b.id = rl.book_id
       JOIN categories c ON c.id = b.category_id
       WHERE rl.user_id = $1 AND rl.status = 'read'
       GROUP BY c.id, c.name
       ORDER BY read_count DESC, c.name
       LIMIT 3`,
      [userId],
    ),

    // Lecture par mois : 12 lignes, 0 si aucun livre
    pool.query(
      `SELECT m AS month, COUNT(rl.book_id)::int AS read_count
       FROM generate_series(1, 12) AS m
       LEFT JOIN reading_log rl
         ON rl.user_id = $1
         AND rl.status = 'read'
         AND rl.finished_at >= make_date($2::int, 1, 1)
         AND rl.finished_at <  make_date($2::int + 1, 1, 1)
         AND EXTRACT(MONTH FROM rl.finished_at) = m
       GROUP BY m
       ORDER BY m`,
      [userId, year],
    ),
  ]);

  return {
    year,
    readTotal: summary.rows[0].read_total,
    readYear: summary.rows[0].read_year,
    averageRating: ratings.rows[0].average_rating, // null si aucune note
    ratedCount: ratings.rows[0].rated_count,
    topCategories: categories.rows.map((row) => ({
      name: row.name,
      count: row.read_count,
    })),
    monthly: months.rows.map((row) => row.read_count), // tableau de 12 nombres
  };
}