// frontend/src/pages/BookDetailPage.jsx
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import FavoriteButton from "../components/books/FavoriteButton";
import ReadingStatusSelect from "../components/books/ReadingStatusSelect";
import BookNoteForm from "../components/books/BookNoteForm";
import ReadButton from "../components/books/ReadButton";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { useBook } from "../hooks/useBook";
import { useAuth } from "../hooks/useAuth";
import { recordView } from "../services/accountService";
import { getCoverUrl, DEFAULT_COVER } from "../utils/getCoverUrl";

function BookDetailPage() {
  const { id } = useParams(); // l'id vient de l'URL : /livres/:id
  const { user } = useAuth();
  const { book, loading, error, reload } = useBook(id);

  // Connecté : on mémorise cette consultation (sans jamais bloquer l'affichage)
  useEffect(() => {
    if (user && book) {
      recordView(book.id).catch(() => {});
    }
  }, [user, book]);

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_COVER;
  };

  if (loading) return <Loader label="Chargement du livre…" />;

  if (error) {
    // Une erreur 4xx (livre introuvable, id invalide) ne se corrige pas en réessayant
    const canRetry = !error.status || error.status >= 500;
    return (
      <div>
        <ErrorMessage
          message={error.message}
          onRetry={canRetry ? reload : undefined}
        />
        <div className="text-center">
          <Link to="/" className="btn btn-outline-primary">
            Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="btn btn-link px-0 mb-3">
        ← Retour au catalogue
      </Link>

      <div className="row g-4">
        <div className="col-12 col-sm-6 col-md-4 col-lg-3">
          <div className="book-detail-cover-wrap">
            <img
              src={getCoverUrl(book)}
              alt={`Couverture du livre ${book.title}`}
              className="book-detail-cover"
              onError={handleImageError}
            />
            <FavoriteButton bookId={book.id} bookTitle={book.title} />
          </div>
        </div>

        <div className="col-12 col-md-8 col-lg-9">
          <h1 className="h3">{book.title}</h1>
          <p className="text-secondary mb-2">
            {book.author}
            {book.publication_year ? ` · ${book.publication_year}` : ""}
          </p>
          <span className="book-category">{book.category}</span>

          <h2 className="h6 mt-4">Résumé</h2>
          <p>{book.description || "Aucune description disponible."}</p>

          <ReadButton book={book} />

          <ReadingStatusSelect bookId={book.id} />
          <BookNoteForm bookId={book.id} />
        </div>
      </div>
    </div>
  );
}

export default BookDetailPage;
