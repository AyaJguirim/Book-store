-- Book Store : « Mot de passe oublié »
-- Migration NON destructive : à exécuter sur une base existante (rien n'est supprimé).
-- Re-exécutable sans risque (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS password_resets (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,   -- empreinte SHA-256 du jeton (64 caractères hexadécimaux)
  expires_at TIMESTAMP NOT NULL,         -- après cette date, le lien ne fonctionne plus
  used_at    TIMESTAMP,                  -- rempli quand le lien a servi (usage unique)
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);