-- Tests des tables utilisateur. Ne laisse aucune donnee a la fin.
-- Chaque ERREUR attendue est normale : c'est la base qui protege les donnees.

\echo '=== 1. Creation d''un utilisateur : INSERT 0 1'
INSERT INTO users (name, email, password_hash)
VALUES ('Test', 'Test@Exemple.com', 'hash-de-test');

SELECT id AS uid FROM users WHERE lower(email) = 'test@exemple.com' \gset

\echo '=== 2. Meme e-mail en minuscules : ERREUR (unique)'
INSERT INTO users (name, email, password_hash)
VALUES ('Autre', 'test@exemple.com', 'hash-de-test');

\echo '=== 3. Nom fait d''espaces : ERREUR (verification)'
INSERT INTO users (name, email, password_hash)
VALUES ('   ', 'autre@exemple.com', 'hash-de-test');

\echo '=== 4. Favori valide : INSERT 0 1'
INSERT INTO favorites (user_id, book_id) VALUES (:uid, 6);

\echo '=== 5. Meme favori deux fois : ERREUR (doublon)'
INSERT INTO favorites (user_id, book_id) VALUES (:uid, 6);

\echo '=== 6. Favori vers un livre inexistant : ERREUR (cle etrangere)'
INSERT INTO favorites (user_id, book_id) VALUES (:uid, 999);

\echo '=== 7. Journal, statut valide : INSERT 0 1'
INSERT INTO reading_log (user_id, book_id, status) VALUES (:uid, 6, 'reading');

\echo '=== 8. Journal, statut invalide : ERREUR (verification)'
INSERT INTO reading_log (user_id, book_id, status) VALUES (:uid, 7, 'termine');

\echo '=== 9. Passage a "read" : UPDATE 1'
UPDATE reading_log SET status = 'read', finished_at = CURRENT_DATE
WHERE user_id = :uid AND book_id = 6;

\echo '=== 10. Note valide : INSERT 0 1'
INSERT INTO notes (user_id, book_id, rating, content) VALUES (:uid, 6, 4, 'Tres bon livre');

\echo '=== 11. Note de 6 etoiles : ERREUR (verification)'
INSERT INTO notes (user_id, book_id, rating, content) VALUES (:uid, 7, 6, 'x');

\echo '=== 12. Note sans etoiles ni texte : ERREUR (verification)'
INSERT INTO notes (user_id, book_id, rating, content) VALUES (:uid, 8, NULL, '  ');

\echo '=== 13. Objectif 2026 valide : INSERT 0 1'
INSERT INTO reading_goals (user_id, year, target) VALUES (:uid, 2026, 24);

\echo '=== 14. Objectif de 0 livre : ERREUR (verification)'
INSERT INTO reading_goals (user_id, year, target) VALUES (:uid, 2027, 0);

\echo '=== 15. Consultation recente : INSERT 0 1'
INSERT INTO recent_views (user_id, book_id) VALUES (:uid, 6);

\echo '=== 16. Contenu pour ce compte : 1 / 1 / 1 / 1 / 1'
SELECT (SELECT COUNT(*) FROM favorites     WHERE user_id = :uid) AS favoris,
       (SELECT COUNT(*) FROM reading_log   WHERE user_id = :uid) AS journal,
       (SELECT COUNT(*) FROM notes         WHERE user_id = :uid) AS notes,
       (SELECT COUNT(*) FROM reading_goals WHERE user_id = :uid) AS objectifs,
       (SELECT COUNT(*) FROM recent_views  WHERE user_id = :uid) AS consultes;

\echo '=== 17. Suppression du compte : DELETE 1'
DELETE FROM users WHERE id = :uid;

\echo '=== 18. Plus aucune donnee liee (0 partout), livres toujours 25'
SELECT (SELECT COUNT(*) FROM favorites)     AS favoris,
       (SELECT COUNT(*) FROM reading_log)   AS journal,
       (SELECT COUNT(*) FROM notes)         AS notes,
       (SELECT COUNT(*) FROM reading_goals) AS objectifs,
       (SELECT COUNT(*) FROM recent_views)  AS consultes,
       (SELECT COUNT(*) FROM books)         AS livres;