// frontend/src/pages/admin/AdminAuthorFormPage.jsx
// Formulaire d'ajout (/admin/auteurs/nouveau) et de modification (/admin/auteurs/:id/modifier).
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminNav from "../../components/admin/AdminNav";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import { useAuthor } from "../../hooks/useAuthor";
import { useBooks } from "../../hooks/useBooks";
import { createAuthor, updateAuthor } from "../../services/adminAuthorService";
import { getAuthorPhotoUrl } from "../../utils/getAuthorPhotoUrl";
import { getErrorMessage } from "../../utils/getErrorMessage";

const MAX_PHOTO_MB = 5;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// "Émile  ZOLA " et "emile zola" désignent le même auteur (comme côté serveur)
function normalizeName(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Le formulaire lui-même : `author` vaut null pour un ajout, l'objet auteur pour une modification
function AuthorForm({ author }) {
  const navigate = useNavigate();
  const isEdit = author !== null;
  const { books } = useBooks(); // sert à suggérer les noms d'auteurs déjà présents dans les livres

  const [name, setName] = useState(author?.name ?? "");
  const [nationality, setNationality] = useState(author?.nationality ?? "");
  const [birthDate, setBirthDate] = useState(author?.birth_date ?? "");
  const [deathDate, setDeathDate] = useState(author?.death_date ?? "");
  const [birthPlace, setBirthPlace] = useState(author?.birth_place ?? "");
  const [biography, setBiography] = useState(author?.biography ?? "");
  const [photoFile, setPhotoFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Noms d'auteurs distincts trouvés dans le catalogue (suggestions du champ « Nom »)
  const bookAuthors = useMemo(
    () => [...new Set(books.map((book) => book.author))].sort((a, b) => a.localeCompare(b, "fr")),
    [books],
  );

  // Combien de livres du catalogue correspondent au nom saisi ?
  const matchingBooks = useMemo(() => {
    const wanted = normalizeName(name);
    if (wanted === "") return 0;
    return books.filter((book) => normalizeName(book.author) === wanted).length;
  }, [books, name]);

  // Aperçu de la photo choisie (adresse temporaire créée par le navigateur)
  const photoPreview = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile],
  );

  const handlePhotoChange = (event) => {
    const file = event.target.files[0] ?? null;
    setError(null);
    if (file && !PHOTO_TYPES.includes(file.type)) {
      setError("La photo doit être une image JPG, PNG ou WebP.");
      event.target.value = "";
      setPhotoFile(null);
      return;
    }
    if (file && file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setError(`La photo dépasse ${MAX_PHOTO_MB} Mo.`);
      event.target.value = "";
      setPhotoFile(null);
      return;
    }
    setPhotoFile(file);
    if (file) setRemovePhoto(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (name.trim() === "") {
      setError("Le nom de l'auteur est obligatoire.");
      return;
    }
    if (birthDate && deathDate && deathDate < birthDate) {
      setError("La date de décès ne peut pas précéder la date de naissance.");
      return;
    }

    // FormData : le format qui permet d'envoyer du texte ET un fichier
    const formData = new FormData();
    formData.append("name", name);
    formData.append("nationality", nationality);
    formData.append("birth_date", birthDate);
    formData.append("death_date", deathDate);
    formData.append("birth_place", birthPlace);
    formData.append("biography", biography);
    if (photoFile) formData.append("photo", photoFile);
    if (removePhoto) formData.append("remove_photo", "true");

    setSubmitting(true);
    try {
      if (isEdit) await updateAuthor(author.id, formData);
      else await createAuthor(formData);
      navigate("/admin/auteurs");
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  const currentPhoto =
    photoPreview ?? (isEdit && author.photo_path && !removePhoto ? getAuthorPhotoUrl(author) : null);

  return (
    <div>
      <AdminNav />
      <Link to="/admin/auteurs" className="btn btn-link px-0 mb-3">
        ← Retour à la gestion des auteurs
      </Link>
      <h1 className="h3 mb-4">
        {isEdit ? `Modifier « ${author.name} »` : "Ajouter un auteur"}
      </h1>

      <form onSubmit={handleSubmit} className="row g-3" noValidate>
        {error && (
          <div className="col-12">
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          </div>
        )}

        <div className="col-12 col-md-6">
          <label htmlFor="author-name" className="form-label">
            Nom *
          </label>
          <input
            id="author-name"
            className="form-control"
            value={name}
            maxLength={150}
            list="book-authors"
            onChange={(event) => setName(event.target.value)}
            required
          />
          <datalist id="book-authors">
            {bookAuthors.map((bookAuthor) => (
              <option key={bookAuthor} value={bookAuthor} />
            ))}
          </datalist>
          <div className={`form-text ${matchingBooks > 0 ? "text-success" : ""}`}>
            {matchingBooks > 0
              ? `${matchingBooks} livre${matchingBooks > 1 ? "s" : ""} du catalogue ${matchingBooks > 1 ? "portent" : "porte"} ce nom d'auteur : ${matchingBooks > 1 ? "ils apparaîtront" : "il apparaîtra"} dans « Principales œuvres ».`
              : "Pour que ses livres apparaissent, utilisez le même nom que dans le champ « Auteur » des livres (des suggestions s'affichent)."}
          </div>
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor="author-nationality" className="form-label">
            Nationalité
          </label>
          <input
            id="author-nationality"
            className="form-control"
            value={nationality}
            maxLength={100}
            onChange={(event) => setNationality(event.target.value)}
          />
        </div>

        <div className="col-12 col-md-4">
          <label htmlFor="author-birth-date" className="form-label">
            Date de naissance
          </label>
          <input
            id="author-birth-date"
            type="date"
            className="form-control"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
        </div>

        <div className="col-12 col-md-4">
          <label htmlFor="author-death-date" className="form-label">
            Date de décès
          </label>
          <input
            id="author-death-date"
            type="date"
            className="form-control"
            value={deathDate}
            onChange={(event) => setDeathDate(event.target.value)}
          />
        </div>

        <div className="col-12 col-md-4">
          <label htmlFor="author-birth-place" className="form-label">
            Lieu de naissance
          </label>
          <input
            id="author-birth-place"
            className="form-control"
            value={birthPlace}
            maxLength={150}
            onChange={(event) => setBirthPlace(event.target.value)}
          />
        </div>

        <div className="col-12">
          <label htmlFor="author-biography" className="form-label">
            Biographie
          </label>
          <textarea
            id="author-biography"
            className="form-control"
            rows="8"
            maxLength={10000}
            value={biography}
            onChange={(event) => setBiography(event.target.value)}
          />
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor="author-photo" className="form-label">
            Photo (JPG, PNG ou WebP, max {MAX_PHOTO_MB} Mo)
          </label>
          <input
            id="author-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="form-control"
            onChange={handlePhotoChange}
          />
          {currentPhoto && (
            <img
              src={currentPhoto}
              alt="Aperçu de la photo"
              width="110"
              className="mt-2 rounded border"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
          {isEdit && author.photo_path && !photoFile && (
            <div className="form-check mt-2">
              <input
                id="remove-photo"
                type="checkbox"
                className="form-check-input"
                checked={removePhoto}
                onChange={(event) => setRemovePhoto(event.target.checked)}
              />
              <label htmlFor="remove-photo" className="form-check-label">
                Supprimer la photo actuelle
              </label>
            </div>
          )}
        </div>

        <div className="col-12 d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting
              ? "Enregistrement…"
              : isEdit
                ? "Enregistrer les modifications"
                : "Ajouter l'auteur"}
          </button>
          <Link to="/admin/auteurs" className="btn btn-outline-secondary">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}

// Modification : on charge d'abord l'auteur, puis on affiche le formulaire pré-rempli
function EditAuthor({ id }) {
  const { author, loading, error, reload } = useAuthor(id);

  if (loading) return <Loader label="Chargement de l'auteur…" />;
  if (error) {
    const canRetry = !error.status || error.status >= 500;
    return (
      <div>
        <ErrorMessage
          message={error.message}
          onRetry={canRetry ? reload : undefined}
        />
        <div className="text-center">
          <Link to="/admin/auteurs" className="btn btn-outline-primary">
            Retour à la gestion des auteurs
          </Link>
        </div>
      </div>
    );
  }

  return <AuthorForm key={author.id} author={author} />;
}

function AdminAuthorFormPage() {
  const { id } = useParams();
  return id ? <EditAuthor id={id} /> : <AuthorForm author={null} />;
}

export default AdminAuthorFormPage;
