-- Book Store : donnees de demonstration
-- Re-executable : les tables sont videes avant l'insertion.

SET client_encoding = 'UTF8';

TRUNCATE books, categories RESTART IDENTITY CASCADE;

INSERT INTO categories (name) VALUES
  ('Roman'),
  ('Science-fiction'),
  ('Histoire'),
  ('Sciences'),
  ('Art et design');

INSERT INTO books (title, author, category_id, description, publication_year)
SELECT v.title, v.author, c.id, v.description, v.publication_year
FROM (VALUES
  (1,  'Le Petit Prince', 'Antoine de Saint-Exupéry', 'Roman', 'Un aviateur échoué dans le désert rencontre un petit garçon venu d''une autre planète.', 1943),
  (2,  'L''Étranger', 'Albert Camus', 'Roman', 'Le récit de Meursault, un homme indifférent confronté à l''absurdité de l''existence.', 1942),
  (3,  'Les Misérables', 'Victor Hugo', 'Roman', 'La destinée de Jean Valjean, ancien forçat, dans la France du XIXe siècle.', 1862),
  (4,  'Madame Bovary', 'Gustave Flaubert', 'Roman', 'Emma Bovary rêve d''une vie romanesque que sa condition provinciale lui refuse.', 1857),
  (5,  'Germinal', 'Émile Zola', 'Roman', 'La vie et la révolte des mineurs dans le nord de la France.', 1885),

  (6,  'Dune', 'Frank Herbert', 'Science-fiction', 'Sur la planète désertique Arrakis, un jeune héritier doit survivre aux intrigues pour le contrôle de l''épice.', 1965),
  (7,  'Fahrenheit 451', 'Ray Bradbury', 'Science-fiction', 'Dans une société où les livres sont brûlés, un pompier commence à douter de sa mission.', 1953),
  (8,  'Le Meilleur des mondes', 'Aldous Huxley', 'Science-fiction', 'Une société future où le bonheur est fabriqué et la liberté sacrifiée.', 1932),
  (9,  '1984', 'George Orwell', 'Science-fiction', 'Un régime totalitaire surveille chaque citoyen et réécrit le passé.', 1949),
  (10, 'Fondation', 'Isaac Asimov', 'Science-fiction', 'Un mathématicien tente de préserver le savoir humain à la chute d''un empire galactique.', 1951),

  (11, 'Sapiens', 'Yuval Noah Harari', 'Histoire', 'Une histoire de l''humanité, des premiers hommes à nos sociétés modernes.', 2011),
  (12, 'De l''inégalité parmi les sociétés', 'Jared Diamond', 'Histoire', 'Pourquoi certaines civilisations ont dominé les autres : géographie, climat et ressources.', 1997),
  (13, 'L''Ancien Régime et la Révolution', 'Alexis de Tocqueville', 'Histoire', 'Une analyse des causes profondes de la Révolution française.', 1856),
  (14, 'La Méditerranée et le monde méditerranéen à l''époque de Philippe II', 'Fernand Braudel', 'Histoire', 'Une histoire de la longue durée qui fait de la mer Méditerranée son personnage central.', 1949),
  (15, 'Les Origines du totalitarisme', 'Hannah Arendt', 'Histoire', 'Une étude de l''antisémitisme, de l''impérialisme et des régimes totalitaires.', 1951),

  (16, 'Une brève histoire du temps', 'Stephen Hawking', 'Sciences', 'Une introduction accessible à la cosmologie, des trous noirs au Big Bang.', 1988),
  (17, 'Le Gène égoïste', 'Richard Dawkins', 'Sciences', 'L''évolution vue à l''échelle des gènes plutôt que des individus.', 1976),
  (18, 'Cosmos', 'Carl Sagan', 'Sciences', 'Un voyage à travers l''univers et l''histoire de la connaissance scientifique.', 1980),
  (19, 'L''Origine des espèces', 'Charles Darwin', 'Sciences', 'L''ouvrage fondateur de la théorie de l''évolution par sélection naturelle.', 1859),
  (20, 'Le Hasard et la Nécessité', 'Jacques Monod', 'Sciences', 'Une réflexion sur la biologie moléculaire et ses conséquences philosophiques.', 1970),

  (21, 'Histoire de l''art', 'Ernst H. Gombrich', 'Art et design', 'Une présentation claire de l''art, de la préhistoire à l''époque moderne.', 1950),
  (22, 'Le Design des choses quotidiennes', 'Don Norman', 'Art et design', 'Pourquoi certains objets sont simples à utiliser et d''autres source de frustration.', 1988),
  (23, 'Ways of Seeing', 'John Berger', 'Art et design', 'Une réflexion sur la manière dont nous regardons les images et les œuvres d''art.', 1972),
  (24, 'L''Art de la couleur', 'Johannes Itten', 'Art et design', 'Les principes de l''harmonie et des contrastes de couleurs, issus de l''enseignement du Bauhaus.', 1961),
  (25, 'Les Éléments du style typographique', 'Robert Bringhurst', 'Art et design', 'Un guide de référence sur la composition et l''histoire de la typographie.', 1992)
) AS v(ord, title, author, category, description, publication_year)
JOIN categories c ON c.name = v.category
ORDER BY v.ord;