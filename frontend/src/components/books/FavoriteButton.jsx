import { useFavorites } from "../../hooks/useFavorites";

function FavoriteButton({ bookId, bookTitle }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(bookId);

  return (
    <button
      type="button"
      className={`favorite-btn ${active ? "is-active" : ""}`}
      onClick={() => toggleFavorite(bookId)}
      aria-pressed={active}
      aria-label={
        active
          ? `Retirer « ${bookTitle} » des favoris`
          : `Ajouter « ${bookTitle} » aux favoris`
      }
    >
      <span aria-hidden="true">{active ? "♥" : "♡"}</span>
    </button>
  );
}

export default FavoriteButton;
