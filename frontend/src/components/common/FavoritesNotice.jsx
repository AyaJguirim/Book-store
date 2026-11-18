// frontend/src/components/common/FavoritesNotice.jsx
import { useFavorites } from "../../hooks/useFavorites";

// Bandeau affiché quand l'enregistrement ou le chargement des favoris échoue
function FavoritesNotice() {
  const { error, canRetry, clearError, reload } = useFavorites();

  if (!error) return null;

  return (
    <div
      className="alert alert-danger d-flex flex-wrap align-items-center gap-2"
      role="alert"
    >
      <span className="me-auto">{error}</span>
      {canRetry && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={reload}
        >
          Réessayer
        </button>
      )}
      <button
        type="button"
        className="btn-close"
        aria-label="Fermer le message"
        onClick={clearError}
      ></button>
    </div>
  );
}

export default FavoritesNotice;
