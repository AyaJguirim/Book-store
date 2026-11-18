-- Requetes de l'API Book Store + jeu de tests (a executer dans psql)
-- Aucune modification de donnees : peut etre execute autant de fois que voulu.

-- Liste des livres : $1 = texte recherche (NULL = pas de recherche),
--                    $2 = id de categorie (NULL = toutes)
PREPARE search_books(text, integer) AS
SELECT b.id, b.title, b.author, b.category_id, c.name AS category,
       b.cover_url, b.publication_year
FROM books b
JOIN categories c ON c.id = b.category_id
WHERE ($1 IS NULL OR position(unaccent(lower($1)) IN unaccent(lower(b.title))) > 0)
  AND ($2 IS NULL OR b.category_id = $2)
ORDER BY b.id;

-- Un livre par identifiant (avec la description)
PREPARE get_book(integer) AS
SELECT b.id, b.title, b.author, b.category_id, c.name AS category,
       b.description, b.cover_url, b.publication_year
FROM books b
JOIN categories c ON c.id = b.category_id
WHERE b.id = $1;

-- Liste des categories
PREPARE list_categories AS
SELECT id, name FROM categories ORDER BY id;

\echo
\echo '=== A. Tout le catalogue : 25 lignes attendues'
EXECUTE search_books(NULL, NULL);

\echo
\echo '=== B. Recherche "petit" : 1 ligne (id 1)'
EXECUTE search_books('petit', NULL);

\echo
\echo '=== C. Recherche "ETRANGER" (majuscules, sans accent) : 1 ligne (id 2)'
EXECUTE search_books('ETRANGER', NULL);

\echo
\echo '=== D. Recherche "ETRANGER" avec accent sur le E : 1 ligne (id 2)'
EXECUTE search_books(U&'\00C9TRANGER', NULL);

\echo
\echo '=== E. Recherche "histoire" : 2 lignes (ids 16 et 21)'
EXECUTE search_books('histoire', NULL);

\echo
\echo '=== F. Recherche "mediterran" : 1 ligne (id 14)'
EXECUTE search_books('mediterran', NULL);

\echo
\echo '=== G. Categorie 2 seule (Science-fiction) : 5 lignes (ids 6 a 10)'
EXECUTE search_books(NULL, 2);

\echo
\echo '=== H. "histoire" + categorie 4 (Sciences) : 1 ligne (id 16)'
EXECUTE search_books('histoire', 4);

\echo
\echo '=== I. "histoire" + categorie 3 (Histoire) : 0 ligne'
EXECUTE search_books('histoire', 3);

\echo
\echo '=== J. Recherche "%" : 0 ligne (caractere special traite comme du texte)'
EXECUTE search_books('%', NULL);

\echo
\echo '=== K. Recherche "_" : 0 ligne'
EXECUTE search_books('_', NULL);

\echo
\echo '=== L. Categorie inexistante 999 : 0 ligne'
EXECUTE search_books(NULL, 999);

\echo
\echo '=== M. Tentative d''injection SQL : 0 ligne, et la table doit rester intacte'
EXECUTE search_books('''; DROP TABLE books; --', NULL);
SELECT COUNT(*) AS livres_restants FROM books;

\echo
\echo '=== N. Livre 6 : 1 ligne (Dune) avec sa description'
EXECUTE get_book(6);

\echo
\echo '=== O. Livre 999 : 0 ligne'
EXECUTE get_book(999);

\echo
\echo '=== P. Categories : 5 lignes'
EXECUTE list_categories;