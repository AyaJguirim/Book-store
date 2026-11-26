// frontend/src/components/authors/AuthorCard.jsx
// Carte d'un auteur : même style que la carte d'un livre (classe book-card).
import { Link } from "react-router-dom";
import { getAuthorPhotoUrl, DEFAULT_AUTHOR_PHOTO } from "../../utils/getAuthorPhotoUrl";

function AuthorCard({ author }) {
  const handleImageError = (event) => {
    // Si la photo ne charge pas, on affiche l'image par défaut
    event.currentTarget.onerror = null; // évite une boucle infinie si la défaut échoue aussi
    event.currentTarget.src = DEFAULT_AUTHOR_PHOTO;
  };

  const worksLabel =
    author.books_count === 0
      ? "Aucun livre au catalogue"
      : `${author.books_count} livre${author.books_count > 1 ? "s" : ""} au catalogue`;

  return (
    <article className="card book-card h-100 text-center">
      <img
        src={getAuthorPhotoUrl(author)}
        alt={`Photo de ${author.name}`}
        className="author-photo card-img-top"
        loading="lazy"
        onError={handleImageError}
      />
      <div className="card-body d-flex flex-column">
        <h2 className="h6 card-title">
          {/* stretched-link : toute la carte (photo comprise) mène à la fiche de l'auteur */}
          <Link to={`/auteurs/${author.id}`} className="stretched-link">
            {author.name}
          </Link>
        </h2>
        {author.nationality && (
          <p className="text-secondary small mb-1">{author.nationality}</p>
        )}
        <span className="book-category mt-auto align-self-center">{worksLabel}</span>
      </div>
    </article>
  );
}

export default AuthorCard;
