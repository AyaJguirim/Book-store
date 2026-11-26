// frontend/src/pages/AuthorsPage.jsx
// Liste publique des auteurs, sous forme de cartes (photo + nom).
import { Link } from "react-router-dom";
import AuthorCard from "../components/authors/AuthorCard";
import EmptyState from "../components/common/EmptyState";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { useAuth } from "../hooks/useAuth";
import { useAuthors } from "../hooks/useAuthors";

function AuthorsPage() {
  const { authors, loading, error, reload } = useAuthors();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin"; // le serveur refuse de toute façon les actions d'un non-admin

  // Une seule des vues est affichée : chargement, erreur, liste vide ou résultat
  let content;
  if (loading) {
    content = <Loader label="Chargement des auteurs…" />;
  } else if (error) {
    content = <ErrorMessage message={error} onRetry={reload} />;
  } else if (authors.length === 0) {
    content = (
      <EmptyState
        title="Aucun auteur pour le moment"
        message="Les fiches des auteurs apparaîtront ici dès qu'elles seront ajoutées."
      />
    );
  } else {
    content = (
      <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xxl-5 g-4">
        {authors.map((author) => (
          <div className="col" key={author.id}>
            <AuthorCard author={author} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h1 className="h3 mb-0">
          Auteurs
          {!loading && !error && authors.length > 0 && ` (${authors.length})`}
        </h1>

        {/* Visible uniquement pour l'administrateur */}
        {isAdmin && (
          <div className="d-flex gap-2">
            <Link to="/admin/auteurs" className="btn btn-outline-primary">
              Gérer les auteurs
            </Link>
            <Link to="/admin/auteurs/nouveau" className="btn btn-primary">
              + Ajouter un auteur
            </Link>
          </div>
        )}
      </div>
      {content}
    </div>
  );
}

export default AuthorsPage;
