-- Book Store : fonctionnalité « Auteurs »
-- Migration NON destructive : à exécuter sur une base existante (rien n'est supprimé).
-- Re-exécutable sans risque (IF NOT EXISTS).
--
--   psql -U postgres -d bookstore -f sql/migration_authors.sql

CREATE TABLE IF NOT EXISTS authors (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  biography   TEXT,
  birth_date  DATE,
  death_date  DATE,
  birth_place VARCHAR(150),
  nationality VARCHAR(100),
  photo_path  VARCHAR(255),          -- nom du fichier dans backend/uploads/authors/
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT authors_dates_check
    CHECK (death_date IS NULL OR birth_date IS NULL OR death_date >= birth_date)
);

-- Deux auteurs ne peuvent pas avoir le même nom (majuscules ignorées)
CREATE UNIQUE INDEX IF NOT EXISTS idx_authors_name_lower ON authors (lower(name));

-- Les livres d'un auteur sont retrouvés grâce au nom : books.author = authors.name
-- (sans tenir compte des majuscules ni des accents). Aucune colonne n'est ajoutée à books.

-- OPTIONNEL : créer d'un coup une fiche (nom seulement) pour chaque auteur déjà présent dans
-- vos livres. Décommentez les 3 lignes suivantes si vous le souhaitez, puis complétez les
-- fiches depuis l'espace administrateur.
-- INSERT INTO authors (name)
-- SELECT DISTINCT ON (lower(author)) author FROM books
-- ON CONFLICT DO NOTHING;
