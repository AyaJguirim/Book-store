// frontend/src/components/account/FavoriteBooksSection.jsx
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import BookGrid from "../books/BookGrid";
import EmptyState from "../common/EmptyState";
import Loader from "../common/Loader";
import ErrorMessage from "../common/ErrorMessage";
import { useFavorites } from "../../hooks/useFavorites";
import { useBooks } from "../../hooks/useBooks";

function FavoriteBooksSection() {
  const { favorites, ready } = useFavorites();
  const { books, loading: booksLoading, error, reload } = useBooks();
  const navigate = useNavigate();

  const loading = booksLoading || !ready;

  const favoriteBooks = useMemo(
    () => books.filter((book) => favorites.includes(book.id)),
    [books, favorites],
  );

  let content;
  if (loading) {
    content = <Loader label="Chargement de vos favoris…" />;
  } else if (error) {
    content = <ErrorMessage message={error} onRetry={reload} />;
  } else if (favoriteBooks.length === 0) {
    content = (
      <EmptyState
        title="Aucun favori pour le moment"
        message="Cliquez sur le cœur d'un livre du catalogue pour l'ajouter ici."
        actionLabel="Voir le catalogue"
        onAction={() => navigate("/")}
      />
    );
  } else {
    content = <BookGrid books={favoriteBooks} />;
  }

  return (
    <section id="favorites" className="mb-5" aria-labelledby="favorites-title">
      <div className="d-flex justify-content-between align-items-baseline mb-3">
        <h2 id="favorites-title" className="h5 mb-0">
          Mes livres favoris
          {!loading && !error && ` (${favoriteBooks.length})`}
        </h2>
        <Link to="/favoris" className="small">
          Voir la page des favoris
        </Link>
      </div>

      {content}
    </section>
  );
}

export default FavoriteBooksSection;
