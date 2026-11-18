-- Book Store : tables des comptes utilisateurs et de leurs donnees privees
-- A executer APRES schema.sql (la table books doit exister).
-- Re-executable : supprime et recree uniquement ces tables.

DROP TABLE IF EXISTS recent_views;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS reading_log;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS reading_goals;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
  email         VARCHAR(254) NOT NULL CHECK (btrim(email) <> ''),
  password_hash VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- E-mail unique sans tenir compte des majuscules
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE reading_goals (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year    INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  target  INTEGER NOT NULL CHECK (target BETWEEN 1 AND 1000),
  PRIMARY KEY (user_id, year)
);

CREATE TABLE reading_log (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL
              CHECK (status IN ('reading', 'want_to_read', 'read', 'abandoned')),
  started_at  DATE,
  finished_at DATE,
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id)
);

CREATE INDEX idx_reading_log_user_status ON reading_log(user_id, status);

CREATE TABLE favorites (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id)
);

CREATE TABLE notes (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rating     SMALLINT CHECK (rating BETWEEN 1 AND 5),
  content    TEXT CHECK (char_length(content) <= 2000),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id),
  -- Il faut au moins des etoiles ou un commentaire
  CHECK (rating IS NOT NULL OR btrim(coalesce(content, '')) <> '')
);

CREATE TABLE recent_views (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id   INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id)
);

CREATE INDEX idx_recent_views_user_date ON recent_views(user_id, viewed_at DESC);