// frontend/src/components/books/BookCard.jsx
import { Link } from "react-router-dom";
import FavoriteButton from "./FavoriteButton";
import { getCoverUrl, DEFAULT_COVER } from "../../utils/getCoverUrl";

function BookCard({ book }) {
  const handleImageError = (event) => {
    // Si l'image ne charge pas, on affiche l'image par défaut
    event.currentTarget.onerror = null; // évite une boucle infinie si la défaut échoue aussi
    event.currentTarget.src = DEFAULT_COVER;
  };

  return (
    <article className="card book-card h-100">
      <div className="position-relative">
        <img
          src={getCoverUrl(book)}
          alt={`Couverture du livre ${book.title}`}
          className="book-cover card-img-top"
          loading="lazy"
          onError={handleImageError}
        />
        <FavoriteButton bookId={book.id} bookTitle={book.title} />
      </div>
      <div className="card-body d-flex flex-column">
        <h2 className="h6 card-title">
          <Link to={`/livres/${book.id}`} className="stretched-link">
            {book.title}
          </Link>
        </h2>
        <p className="text-secondary small mb-2">{book.author}</p>
        <span className="book-category mt-auto align-self-start">
          {book.category}
        </span>
      </div>
    </article>
  );
}

export default BookCard;
