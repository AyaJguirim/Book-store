// frontend/src/components/books/ReadingStatusSelect.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  getReadingEntry,
  setReadingStatus,
  removeReadingEntry,
} from "../../services/accountService";
import { isCanceled } from "../../services/api";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { READING_STATUSES } from "../../utils/readingStatuses";

function ReadingStatusSelect({ bookId }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [status, setStatus] = useState(""); // '' = pas dans le journal
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Charge le statut actuel de ce livre pour l'utilisateur connecté
  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getReadingEntry(bookId, { signal: controller.signal })
      .then((entry) => setStatus(entry ? entry.status : ""))
      .catch((err) => {
        if (isCanceled(err)) return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [userId, bookId]);

  const handleChange = async (event) => {
    const next = event.target.value;
    const previous = status;

    setStatus(next); // affichage immédiat
    setSaving(true);
    setError(null);

    try {
      if (next === "") {
        await removeReadingEntry(bookId);
      } else {
        await setReadingStatus(bookId, next);
      }
    } catch (err) {
      setStatus(previous); // l'enregistrement a échoué : on revient en arrière
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
          <Link to="/connexion">Connectez-vous</Link> pour suivre votre lecture
          de ce livre.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-3 mt-4">
      <label htmlFor="reading-status" className="form-label fw-semibold">
        Mon journal de lecture
      </label>
      <select
        id="reading-status"
        className="form-select"
        value={status}
        onChange={handleChange}
        disabled={loading || saving}
      >
        <option value="">Pas dans mon journal</option>
        {READING_STATUSES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      {error && (
        <div className="alert alert-danger mt-3 mb-0" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default ReadingStatusSelect;
