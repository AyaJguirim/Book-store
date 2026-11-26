// frontend/src/pages/AuthorDetailPage.jsx
// Fiche d'un auteur : photo, informations personnelles, biographie et principales œuvres.
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BookGrid from "../components/books/BookGrid";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { useAuth } from "../hooks/useAuth";
import { useAuthor } from "../hooks/useAuthor";
import { deleteAuthor } from "../services/adminAuthorService";
import { getErrorMessage } from "../utils/getErrorMessage";
import { getAuthorPhotoUrl, DEFAULT_AUTHOR_PHOTO } from "../utils/getAuthorPhotoUrl";
import { formatIsoDate } from "../utils/formatIsoDate";

function AuthorDetailPage() {
  const { id } = useParams(); // l'id vient de l'URL : /auteurs/:id
  const { author, loading, error, reload } = useAuthor(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Supprimer définitivement la fiche de « ${author.name} » ?\n\nSa photo sera supprimée. Ses livres restent dans le catalogue.`,
    );
    if (!confirmed) return;

    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAuthor(author.id);
      navigate("/auteurs", { replace: true });
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setDeleting(false);
    }
  };

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_AUTHOR_PHOTO;
  };

  if (loading) return <Loader label="Chargement de la fiche…" />;

  if (error) {
    // Une erreur 4xx (auteur introuvable, id invalide) ne se corrige pas en réessayant
    const canRetry = !error.status || error.status >= 500;
    return (
      <div>
        <ErrorMessage
          message={error.message}
          onRetry={canRetry ? reload : undefined}
        />
        <div className="text-center">
          <Link to="/auteurs" className="btn btn-outline-primary">
            Retour à la liste des auteurs
          </Link>
        </div>
      </div>
    );
  }

  // Seules les informations renseignées par l'administrateur sont affichées
  const infos = [
    ["Naissance", formatIsoDate(author.birth_date)],
    ["Lieu de naissance", author.birth_place],
    ["Décès", formatIsoDate(author.death_date)],
    ["Nationalité", author.nationality],
  ].filter(([, value]) => value);

  return (
    <div>
      <Link to="/auteurs" className="btn btn-link px-0 mb-3">
        ← Retour à la liste des auteurs
      </Link>

      <div className="row g-4">
        <div className="col-12 col-sm-6 col-md-4 col-lg-3">
          <img
            src={getAuthorPhotoUrl(author)}
            alt={`Photo de ${author.name}`}
            className="author-detail-photo"
            onError={handleImageError}
          />
        </div>

        <div className="col-12 col-md-8 col-lg-9">
          <h1 className="h3">{author.name}</h1>
          {author.nationality && (
            <span className="book-category">{author.nationality}</span>
          )}

          {/* Visible uniquement pour l'administrateur */}
          {isAdmin && (
            <div className="d-flex gap-2 mt-3">
              <Link
                to={`/admin/auteurs/${author.id}/modifier`}
                className="btn btn-outline-primary btn-sm"
              >
                Modifier
              </Link>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          )}
          {deleteError && (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              {deleteError}
            </div>
          )}

          {infos.length > 0 && (
            <>
              <h2 className="h6 mt-4">Informations</h2>
              <dl className="mb-0">
                {infos.map(([label, value]) => (
                  <div className="row mb-1" key={label}>
                    <dt className="col-sm-4 col-lg-3 text-secondary fw-normal">{label}</dt>
                    <dd className="col-sm-8 col-lg-9 mb-0">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          <h2 className="h6 mt-4">Biographie</h2>
          {/* pre-line : les retours à la ligne saisis par l'administrateur sont conservés */}
          <p style={{ whiteSpace: "pre-line" }}>
            {author.biography || "Aucune biographie disponible."}
          </p>
        </div>
      </div>

      <h2 className="h5 mt-5 mb-3">
        Principales œuvres{author.books.length > 0 && ` (${author.books.length})`}
      </h2>
      {author.books.length === 0 ? (
        <p className="text-secondary">
          Aucun livre de cet auteur n'est disponible au catalogue pour le moment.
        </p>
      ) : (
        <BookGrid books={author.books} />
      )}

      <div className="mt-4">
        <Link to="/auteurs" className="btn btn-outline-primary">
          ← Retour à la liste des auteurs
        </Link>
      </div>
    </div>
  );
}

export default AuthorDetailPage;
