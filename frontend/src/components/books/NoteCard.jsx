// frontend/src/components/books/NoteCard.jsx
import { Link } from "react-router-dom";
import StarRating from "../common/StarRating";
import { getCoverUrl, DEFAULT_COVER } from "../../utils/getCoverUrl";

function formatDate(value) {
  return new Date(value).toLocaleDateString("fr-FR");
}

// Une note de l'utilisateur, avec le livre concerné (note.id = id du livre)
function NoteCard({ note }) {
  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_COVER;
  };

  return (
    <article className="card note-card h-100">
      <div className="d-flex gap-3 p-3">
        <img
          src={getCoverUrl(note)}
          alt=""
          className="note-cover"
          loading="lazy"
          onError={handleImageError}
        />

        <div className="note-body flex-grow-1">
          <h3 className="h6 mb-1">
            <Link to={`/livres/${note.id}`}>{note.title}</Link>
          </h3>
          <p className="text-secondary small mb-2">{note.author}</p>

          {note.rating !== null && (
            <div className="mb-2">
              <StarRating value={note.rating} readOnly />
            </div>
          )}

          {note.content && <p className="note-content mb-2">{note.content}</p>}

          <p className="text-secondary small mb-0">
            Modifiée le {formatDate(note.updated_at)} ·{" "}
            <Link to={`/livres/${note.id}`}>Modifier</Link>
          </p>
        </div>
      </div>
    </article>
  );
}

export default NoteCard;
