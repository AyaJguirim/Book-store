-- Book Store : lecture des livres PDF, gestion admin, progression de lecture
-- Migration NON destructive : à exécuter sur une base existante (aucune donnée supprimée).
-- Re-exécutable sans risque (IF NOT EXISTS partout).
--
--   psql -U <utilisateur> -d <base> -f sql/migration_pdf_reader.sql

-- 1) Rôle des utilisateurs : 'user' par défaut, 'admin' pour l'administrateur du site
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

-- 2) Fichiers d'un livre : noms des fichiers stockés dans backend/uploads/
ALTER TABLE books ADD COLUMN IF NOT EXISTS pdf_path   VARCHAR(255);
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_path VARCHAR(255);

-- 3) Progression de lecture : une ligne par (utilisateur, livre)
--    = dernière page consultée + historique de lecture (via updated_at)
CREATE TABLE IF NOT EXISTS reading_progress (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  last_page   INTEGER NOT NULL CHECK (last_page >= 1),
  total_pages INTEGER CHECK (total_pages >= 1),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user_date
  ON reading_progress(user_id, updated_at DESC);

-- 4) Pour désigner l'administrateur (remplacez l'e-mail par le vôtre) :
--    UPDATE users SET role = 'admin' WHERE lower(email) = lower('admin@exemple.com');
