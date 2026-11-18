// frontend/src/pages/FavoritesPage.jsx
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BookGrid from "../components/books/BookGrid";
import EmptyState from "../components/common/EmptyState";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { useFavorites } from "../hooks/useFavorites";
import { useBooks } from "../hooks/useBooks";

function FavoritesPage() {
  const { favorites, keepOnly, ready } = useFavorites();
  const { books, loading: booksLoading, error, reload } = useBooks();
  const navigate = useNavigate();

  // On attend aussi que les favoris du compte soient chargés
  const loading = booksLoading || !ready;

  // On part des livres de l'API : un id favori sans livre correspondant est ignoré
  const favoriteBooks = useMemo(
    () => books.filter((book) => favorites.includes(book.id)),
    [books, favorites],
  );

  // Nettoyage des favoris orphelins du visiteur, uniquement si le chargement a réussi
  useEffect(() => {
    if (!loading && !error && books.length > 0) {
      keepOnly(books.map((book) => book.id));
    }
  }, [loading, error, books, keepOnly]);

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
    <div>
      <div className="d-flex justify-content-between align-items-baseline mb-4">
        <h1 className="h3 mb-0">Mes favoris</h1>
        {!loading && !error && (
          <span className="text-secondary">
            {favoriteBooks.length} livre{favoriteBooks.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {content}
    </div>
  );
}

export default FavoritesPage;
