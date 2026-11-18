-- backend/sql/stats_test.sql
-- Variables attendues (passées avec -v) : uid = id de l'utilisateur, year = année

-- 1. Livres lus : total et pour l'année
SELECT
  COUNT(*) FILTER (WHERE status = 'read') AS read_total,
  COUNT(*) FILTER (
    WHERE status = 'read'
      AND finished_at >= make_date(:year, 1, 1)
      AND finished_at <  make_date(:year + 1, 1, 1)
  ) AS read_year
FROM reading_log
WHERE user_id = :uid;

-- 2. Note moyenne (une décimale) et nombre de livres notés
SELECT
  ROUND(AVG(rating)::numeric, 1) AS average_rating,
  COUNT(rating) AS rated_count
FROM notes
WHERE user_id = :uid;

-- 3. Les 3 catégories où l'on a lu le plus de livres
SELECT c.name, COUNT(*) AS read_count
FROM reading_log rl
JOIN books b ON b.id = rl.book_id
JOIN categories c ON c.id = b.category_id
WHERE rl.user_id = :uid AND rl.status = 'read'
GROUP BY c.id, c.name
ORDER BY read_count DESC, c.name
LIMIT 3;

-- 4. Lecture par mois (12 lignes, 0 si aucun livre)
SELECT m AS month, COUNT(rl.book_id) AS read_count
FROM generate_series(1, 12) AS m
LEFT JOIN reading_log rl
  ON rl.user_id = :uid
  AND rl.status = 'read'
  AND rl.finished_at >= make_date(:year, 1, 1)
  AND rl.finished_at <  make_date(:year + 1, 1, 1)
  AND EXTRACT(MONTH FROM rl.finished_at) = m
GROUP BY m
ORDER BY m;