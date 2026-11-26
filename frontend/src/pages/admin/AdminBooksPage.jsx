// frontend/src/pages/admin/AdminBooksPage.jsx
// Espace administrateur : liste des livres avec Ajouter / Modifier / Supprimer.
import { useState } from "react";
import { Link } from "react-router-dom";
import AdminNav from "../../components/admin/AdminNav";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import { useBooks } from "../../hooks/useBooks";
import { deleteBook } from "../../services/adminBookService";
import { getCoverUrl, DEFAULT_COVER } from "../../utils/getCoverUrl";
import { getErrorMessage } from "../../utils/getErrorMessage";

function AdminBooksPage() {
  const { books, loading, error, reload } = useBooks();
  const [actionError, setActionError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_COVER;
  };

  const handleDelete = async (book) => {
    const confirmed = window.confirm(
      `Supprimer définitivement « ${book.title} » ?\n\nSon PDF, sa couverture, les favoris et l'historique de lecture associés seront aussi supprimés.`,
    );
    if (!confirmed) return;

    setActionError(null);
    setDeletingId(book.id);
    try {
      await deleteBook(book.id);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  let content;
  if (loading) {
    content = <Loader label="Chargement des livres…" />;
  } else if (error) {
    content = <ErrorMessage message={error} onRetry={reload} />;
  } else if (books.length === 0) {
    content = <p className="text-secondary">Aucun livre dans le catalogue.</p>;
  } else {
    content = (
      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th scope="col">Couverture</th>
              <th scope="col">Titre</th>
              <th scope="col">Auteur</th>
              <th scope="col">Catégorie</th>
              <th scope="col">PDF</th>
              <th scope="col" className="text-end">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id}>
                <td>
                  <img
                    src={getCoverUrl(book)}
                    alt=""
                    width="40"
                    height="60"
                    style={{ objectFit: "cover", borderRadius: 4 }}
                    onError={handleImageError}
                  />
                </td>
                <td>
                  <Link to={`/livres/${book.id}`}>{book.title}</Link>
                </td>
                <td>{book.author}</td>
                <td>{book.category}</td>
                <td>
                  {book.has_pdf ? (
                    <span className="badge text-bg-success">Importé</span>
                  ) : (
                    <span className="badge text-bg-secondary">Aucun</span>
                  )}
                </td>
                <td className="text-end text-nowrap">
                  <Link
                    to={`/admin/livres/${book.id}/modifier`}
                    className="btn btn-outline-primary btn-sm me-2"
                  >
                    Modifier
                  </Link>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDelete(book)}
                    disabled={deletingId === book.id}
                  >
                    {deletingId === book.id ? "Suppression…" : "Supprimer"}
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
          Gestion des livres
          {!loading && !error && ` (${books.length})`}
        </h1>
        <Link to="/admin/livres/nouveau" className="btn btn-primary">
          + Ajouter un livre
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

export default AdminBooksPage;
