-- Book Store : creation des tables
-- Attention : ce script SUPPRIME les tables existantes puis les recree.
-- Il est donc re-executable, mais efface les donnees (on les reinsere avec seed.sql).

CREATE EXTENSION IF NOT EXISTS unaccent;

DROP TABLE IF EXISTS reading_progress;
DROP TABLE IF EXISTS recent_views;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS reading_log;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS reading_goals;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE books (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(200) NOT NULL,
  author           VARCHAR(150) NOT NULL,
  category_id      INTEGER NOT NULL REFERENCES categories(id),
  description      TEXT,
  cover_url        VARCHAR(500),
  pdf_path         VARCHAR(255),
  cover_path       VARCHAR(255),
  publication_year INTEGER CHECK (publication_year BETWEEN 1 AND 2100),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (btrim(title) <> ''),
  CHECK (btrim(author) <> '')
);

CREATE INDEX idx_books_category_id ON books(category_id);