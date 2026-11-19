// frontend/src/components/account/ReadingHistorySection.jsx
// "Historique de lecture" de Mon espace : les livres ouverts, avec la dernière page lue.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EmptyState from "../common/EmptyState";
import Loader from "../common/Loader";
import ErrorMessage from "../common/ErrorMessage";
import { useReadingHistory } from "../../hooks/useReadingHistory";
import { getCoverUrl, DEFAULT_COVER } from "../../utils/getCoverUrl";
import { getErrorMessage } from "../../utils/getErrorMessage";

function formatDate(value) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ReadingHistorySection() {
  const { books, loading, error, reload, remove } = useReadingHistory();
  const [removeError, setRemoveError] = useState(null);
  const navigate = useNavigate();

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_COVER;
  };

  const handleRemove = async (book) => {
    setRemoveError(null);
    try {
      await remove(book.id);
    } catch (err) {
      setRemoveError(getErrorMessage(err));
    }
  };

  let content;
  if (loading) {
    content = <Loader label="Chargement de votre historique de lecture…" />;
  } else if (error) {
    content = <ErrorMessage message={error} onRetry={reload} />;
  } else if (books.length === 0) {
    content = (
      <EmptyState
        title="Aucune lecture pour le moment"
        message="Les livres que vous ouvrez en lecture apparaîtront ici, avec votre dernière page."
        actionLabel="Voir le catalogue"
        onAction={() => navigate("/")}
      />
    );
  } else {
    content = (
      <ul className="list-group">
        {books.map((book) => {
          const percent = book.total_pages
            ? Math.round((book.last_page / book.total_pages) * 100)
            : null;
          return (
            <li
              key={book.id}
              className="list-group-item d-flex flex-wrap align-items-center gap-3"
            >
              <img
                src={getCoverUrl(book)}
                alt=""
                width="48"
                height="72"
                style={{ objectFit: "cover", borderRadius: 4 }}
                onError={handleImageError}
              />

              <div className="flex-grow-1">
                <Link to={`/livres/${book.id}`} className="fw-semibold">
                  {book.title}
                </Link>
                <div className="text-secondary small">{book.author}</div>
                <div className="small">
                  Page {book.last_page}
                  {book.total_pages ? ` sur ${book.total_pages}` : ""}
                  {percent !== null && ` (${percent} %)`} · lu le{" "}
                  {formatDate(book.updated_at)}
                </div>
              </div>

              <div className="d-flex gap-2">
                {book.has_pdf && (
                  <Link
                    to={`/livres/${book.id}/lire`}
                    className="btn btn-primary btn-sm"
                  >
                    Reprendre
                  </Link>
                )}
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => handleRemove(book)}
                  aria-label={`Retirer « ${book.title} » de l'historique de lecture`}
                >
                  Retirer
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section id="reading-history" className="mb-5" aria-labelledby="reading-history-title">
      <h2 id="reading-history-title" className="h5 mb-3">
        Historique de lecture
        {!loading && !error && ` (${books.length})`}
      </h2>

      {removeError && (
        <div className="alert alert-danger" role="alert">
          {removeError}
        </div>
      )}

      {content}
    </section>
  );
}

export default ReadingHistorySection;
