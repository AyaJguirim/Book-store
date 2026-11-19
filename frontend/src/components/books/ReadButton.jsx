// frontend/src/components/books/ReadButton.jsx
// Bouton "Lire" de la fiche d'un livre : propose de reprendre là où l'utilisateur s'est arrêté.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getReadingProgress } from "../../services/readingProgressService";

function ReadButton({ book }) {
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!user || !book.has_pdf) return;

    let cancelled = false;
    getReadingProgress(book.id)
      .then((result) => {
        if (!cancelled) setProgress(result);
      })
      .catch(() => {}); // le bouton "Lire" fonctionne même sans cette information

    return () => {
      cancelled = true;
    };
  }, [user, book.id, book.has_pdf]);

  if (!book.has_pdf) {
    return (
      <p className="text-secondary small mt-3 mb-0">
        Ce livre n'est pas encore disponible en lecture en ligne.
      </p>
    );
  }

  if (loading) return null;

  if (!user) {
    return (
      <div className="mt-3">
        <Link to="/connexion" className="btn btn-primary">
          Se connecter pour lire ce livre
        </Link>
      </div>
    );
  }

  const resumePage = user && progress ? progress.last_page : null;

  return (
    <div className="mt-3">
      <Link to={`/livres/${book.id}/lire`} className="btn btn-primary">
        {resumePage
          ? `Reprendre la lecture (page ${resumePage}${progress.total_pages ? ` sur ${progress.total_pages}` : ""})`
          : "Lire le livre"}
      </Link>
    </div>
  );
}

export default ReadButton;
