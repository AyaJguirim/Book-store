// frontend/src/components/books/BookNoteForm.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import StarRating from "../common/StarRating";
import { useAuth } from "../../hooks/useAuth";
import { getNote, saveNote, deleteNote } from "../../services/noteService";
import { isCanceled } from "../../services/api";
import { getErrorMessage } from "../../utils/getErrorMessage";

const MAX_CONTENT = 2000;

function BookNoteForm({ bookId }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [hasNote, setHasNote] = useState(false);
  const [rating, setRating] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Charge la note existante de ce livre pour l'utilisateur connecté
  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setMessage(null);

    getNote(bookId, { signal: controller.signal })
      .then((note) => {
        setHasNote(note !== null);
        setRating(note ? note.rating : null);
        setContent(note?.content ?? "");
      })
      .catch((err) => {
        if (isCanceled(err)) return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [userId, bookId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const cleanContent = content.trim();
    if (rating === null && cleanContent === "") {
      setError("Ajoutez une note en étoiles ou un commentaire.");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveNote(bookId, {
        rating,
        content: cleanContent === "" ? null : cleanContent,
      });
      setHasNote(true);
      setRating(saved.rating);
      setContent(saved.content ?? "");
      setMessage("Votre note a été enregistrée.");
    } catch (err) {
      // Ce que l'utilisateur a écrit est conservé : il peut réessayer
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Supprimer votre note sur ce livre ?")) return;

    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await deleteNote(bookId);
      setHasNote(false);
      setRating(null);
      setContent("");
      setMessage("Votre note a été supprimée.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Visiteur sans compte : on l'invite à se connecter
  if (!userId) {
    return (
      <div className="card p-3 mt-4">
        <p className="mb-0 text-secondary">
          <Link to="/connexion">Connectez-vous</Link> pour noter ce livre et
          écrire un commentaire.
        </p>
      </div>
    );
  }

  return (
    <form className="card p-3 mt-4" onSubmit={handleSubmit}>
      <h2 className="h6 fw-semibold mb-3">Ma note</h2>

      <div className="mb-3">
        <StarRating
          value={rating}
          onChange={setRating}
          label="Ma note en étoiles"
        />
        <div className="form-text">
          Cliquez à nouveau sur l'étoile choisie pour retirer la note.
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="note-content" className="form-label">
          Mon commentaire (facultatif)
        </label>
        <textarea
          id="note-content"
          className="form-control"
          rows={4}
          maxLength={MAX_CONTENT}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={loading || saving}
        />
        <div className="form-text text-end">
          {content.length} / {MAX_CONTENT}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      )}

      <div className="d-flex flex-wrap gap-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || saving}
        >
          {saving ? "Enregistrement…" : "Enregistrer ma note"}
        </button>
        {hasNote && (
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={handleDelete}
            disabled={loading || saving}
          >
            Supprimer ma note
          </button>
        )}
      </div>
    </form>
  );
}

export default BookNoteForm;
