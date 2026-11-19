// frontend/src/pages/admin/AdminBookFormPage.jsx
// Formulaire d'ajout (/admin/livres/nouveau) et de modification (/admin/livres/:id/modifier).
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import { useBook } from "../../hooks/useBook";
import { useCategories } from "../../hooks/useCategories";
import { createBook, updateBook } from "../../services/adminBookService";
import { getCoverUrl } from "../../utils/getCoverUrl";
import { getErrorMessage } from "../../utils/getErrorMessage";

const MAX_PDF_MB = 100;
const MAX_COVER_MB = 5;
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Le formulaire lui-même : `book` vaut null pour un ajout, l'objet livre pour une modification
function BookForm({ book }) {
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories();
  const isEdit = book !== null;

  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [categoryId, setCategoryId] = useState(book ? String(book.category_id) : "");
  const [year, setYear] = useState(book?.publication_year ? String(book.publication_year) : "");
  const [description, setDescription] = useState(book?.description ?? "");
  const [pdfFile, setPdfFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  // Aperçu de la couverture choisie (adresse temporaire créée par le navigateur)
  const coverPreview = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile],
  );

  const handlePdfChange = (event) => {
    const file = event.target.files[0] ?? null;
    setError(null);
    if (file && file.size > MAX_PDF_MB * 1024 * 1024) {
      setError(`Le PDF dépasse ${MAX_PDF_MB} Mo.`);
      event.target.value = "";
      setPdfFile(null);
      return;
    }
    if (file && file.type !== "application/pdf") {
      setError("Le livre doit être un fichier PDF.");
      event.target.value = "";
      setPdfFile(null);
      return;
    }
    setPdfFile(file);
  };

  const handleCoverChange = (event) => {
    const file = event.target.files[0] ?? null;
    setError(null);
    if (file && !COVER_TYPES.includes(file.type)) {
      setError("La couverture doit être une image JPG, PNG ou WebP.");
      event.target.value = "";
      setCoverFile(null);
      return;
    }
    if (file && file.size > MAX_COVER_MB * 1024 * 1024) {
      setError(`La couverture dépasse ${MAX_COVER_MB} Mo.`);
      event.target.value = "";
      setCoverFile(null);
      return;
    }
    setCoverFile(file);
    if (file) setRemoveCover(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (title.trim() === "" || author.trim() === "" || categoryId === "") {
      setError("Le titre, l'auteur et la catégorie sont obligatoires.");
      return;
    }

    // FormData : le format qui permet d'envoyer du texte ET des fichiers
    const formData = new FormData();
    formData.append("title", title);
    formData.append("author", author);
    formData.append("category_id", categoryId);
    formData.append("publication_year", year);
    formData.append("description", description);
    if (pdfFile) formData.append("pdf", pdfFile);
    if (coverFile) formData.append("cover", coverFile);
    if (removeCover) formData.append("remove_cover", "true");

    setSubmitting(true);
    setUploadPercent(0);
    try {
      if (isEdit) await updateBook(book.id, formData, { onProgress: setUploadPercent });
      else await createBook(formData, { onProgress: setUploadPercent });
      navigate("/admin/livres");
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  if (categoriesLoading) return <Loader label="Chargement du formulaire…" />;
  if (categoriesError) return <ErrorMessage message={categoriesError} />;

  const currentCover = coverPreview ?? (!removeCover && isEdit ? getCoverUrl(book) : null);

  return (
    <div>
      <Link to="/admin/livres" className="btn btn-link px-0 mb-3">
        ← Retour à la gestion des livres
      </Link>
      <h1 className="h3 mb-4">{isEdit ? `Modifier « ${book.title} »` : "Ajouter un livre"}</h1>

      <form onSubmit={handleSubmit} className="row g-3" noValidate>
        {error && (
          <div className="col-12">
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          </div>
        )}

        <div className="col-12 col-md-6">
          <label htmlFor="book-title" className="form-label">
            Titre *
          </label>
          <input
            id="book-title"
            className="form-control"
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor="book-author" className="form-label">
            Auteur *
          </label>
          <input
            id="book-author"
            className="form-control"
            value={author}
            maxLength={150}
            onChange={(event) => setAuthor(event.target.value)}
            required
          />
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor="book-category" className="form-label">
            Catégorie *
          </label>
          <select
            id="book-category"
            className="form-select"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
            <option value="">Choisir…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor="book-year" className="form-label">
            Année de publication
          </label>
          <input
            id="book-year"
            type="number"
            min="1"
            max="2100"
            className="form-control"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </div>

        <div className="col-12">
          <label htmlFor="book-description" className="form-label">
            Description
          </label>
          <textarea
            id="book-description"
            className="form-control"
            rows="4"
            maxLength={5000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor="book-pdf" className="form-label">
            Fichier PDF du livre (max {MAX_PDF_MB} Mo)
          </label>
          <input
            id="book-pdf"
            type="file"
            accept="application/pdf"
            className="form-control"
            onChange={handlePdfChange}
          />
          {isEdit && (
            <div className="form-text">
              {book.has_pdf
                ? "Un PDF est déjà importé. Choisissez un fichier seulement pour le remplacer."
                : "Aucun PDF importé pour le moment."}
            </div>
          )}
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor="book-cover" className="form-label">
            Couverture (JPG, PNG ou WebP, max {MAX_COVER_MB} Mo)
          </label>
          <input
            id="book-cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="form-control"
            onChange={handleCoverChange}
          />
          {currentCover && (
            <img
              src={currentCover}
              alt="Aperçu de la couverture"
              width="90"
              className="mt-2 rounded border"
              onError={(event) => {
                // Pas de couverture à cet endroit (ancien livre sans image) : on masque l'aperçu
                event.currentTarget.style.display = "none";
              }}
            />
          )}
          {isEdit && book.cover_path && !coverFile && (
            <div className="form-check mt-2">
              <input
                id="remove-cover"
                type="checkbox"
                className="form-check-input"
                checked={removeCover}
                onChange={(event) => setRemoveCover(event.target.checked)}
              />
              <label htmlFor="remove-cover" className="form-check-label">
                Supprimer la couverture importée
              </label>
            </div>
          )}
        </div>

        {submitting && (pdfFile || coverFile) && (
          <div className="col-12">
            <div className="progress" role="progressbar" aria-label="Envoi des fichiers" aria-valuenow={uploadPercent} aria-valuemin="0" aria-valuemax="100">
              <div className="progress-bar" style={{ width: `${uploadPercent}%` }}>
                {uploadPercent} %
              </div>
            </div>
          </div>
        )}

        <div className="col-12 d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Ajouter le livre"}
          </button>
          <Link to="/admin/livres" className="btn btn-outline-secondary">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}

// Modification : on charge d'abord le livre, puis on affiche le formulaire pré-rempli
function EditBook({ id }) {
  const { book, loading, error, reload } = useBook(id);

  if (loading) return <Loader label="Chargement du livre…" />;
  if (error) {
    const canRetry = !error.status || error.status >= 500;
    return (
      <div>
        <ErrorMessage message={error.message} onRetry={canRetry ? reload : undefined} />
        <div className="text-center">
          <Link to="/admin/livres" className="btn btn-outline-primary">
            Retour à la gestion des livres
          </Link>
        </div>
      </div>
    );
  }

  return <BookForm key={book.id} book={book} />;
}

function AdminBookFormPage() {
  const { id } = useParams();
  return id ? <EditBook id={id} /> : <BookForm book={null} />;
}

export default AdminBookFormPage;
