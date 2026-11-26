// frontend/src/pages/admin/AdminAuthorsPage.jsx
// Espace administrateur : liste des auteurs avec Ajouter / Modifier / Supprimer.
import { useState } from "react";
import { Link } from "react-router-dom";
import AdminNav from "../../components/admin/AdminNav";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import { useAuthors } from "../../hooks/useAuthors";
import { deleteAuthor } from "../../services/adminAuthorService";
import { getAuthorPhotoUrl, DEFAULT_AUTHOR_PHOTO } from "../../utils/getAuthorPhotoUrl";
import { getErrorMessage } from "../../utils/getErrorMessage";

function AdminAuthorsPage() {
  const { authors, loading, error, reload } = useAuthors();
  const [actionError, setActionError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_AUTHOR_PHOTO;
  };

  const handleDelete = async (author) => {
    const confirmed = window.confirm(
      `Supprimer définitivement la fiche de « ${author.name} » ?\n\nSa photo sera supprimée. Ses livres restent dans le catalogue.`,
    );
    if (!confirmed) return;

    setActionError(null);
    setDeletingId(author.id);
    try {
      await deleteAuthor(author.id);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  let content;
  if (loading) {
    content = <Loader label="Chargement des auteurs…" />;
  } else if (error) {
    content = <ErrorMessage message={error} onRetry={reload} />;
  } else if (authors.length === 0) {
    content = (
      <p className="text-secondary">
        Aucun auteur pour le moment. Cliquez sur « Ajouter un auteur » pour créer la première fiche.
      </p>
    );
  } else {
    content = (
      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th scope="col">Photo</th>
              <th scope="col">Nom</th>
              <th scope="col">Nationalité</th>
              <th scope="col">Livres</th>
              <th scope="col" className="text-end">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {authors.map((author) => (
              <tr key={author.id}>
                <td>
                  <img
                    src={getAuthorPhotoUrl(author)}
                    alt=""
                    width="45"
                    height="60"
                    style={{ objectFit: "cover", borderRadius: 4 }}
                    onError={handleImageError}
                  />
                </td>
                <td>
                  <Link to={`/auteurs/${author.id}`}>{author.name}</Link>
                </td>
                <td>{author.nationality || "—"}</td>
                <td>{author.books_count}</td>
                <td className="text-end text-nowrap">
                  <Link
                    to={`/admin/auteurs/${author.id}/modifier`}
                    className="btn btn-outline-primary btn-sm me-2"
                  >
                    Modifier
                  </Link>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDelete(author)}
                    disabled={deletingId === author.id}
                  >
                    {deletingId === author.id ? "Suppression…" : "Supprimer"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <AdminNav />
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h1 className="h3 mb-0">
          Gestion des auteurs
          {!loading && !error && ` (${authors.length})`}
        </h1>
        <Link to="/admin/auteurs/nouveau" className="btn btn-primary">
          + Ajouter un auteur
        </Link>
      </div>

      {actionError && (
        <div className="alert alert-danger" role="alert">
          {actionError}
        </div>
      )}

      {content}
    </div>
  );
}

export default AdminAuthorsPage;
