// frontend/src/components/account/ReadingGoalCard.jsx
import { useState } from "react";
import Loader from "../common/Loader";
import ErrorMessage from "../common/ErrorMessage";
import { useReadingGoal } from "../../hooks/useReadingGoal";
import { getErrorMessage } from "../../utils/getErrorMessage";

const MAX_TARGET = 1000;

function plural(count, word) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

function ReadingGoalCard({ year }) {
  const { goal, loading, error, reload, save, remove } = useReadingGoal(year);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [message, setMessage] = useState(null);

  if (loading) return <Loader label="Chargement de votre objectif…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const hasGoal = goal.target !== null;
  const showForm = editing || !hasGoal;
  const percent = hasGoal
    ? Math.min(100, Math.round((goal.read / goal.target) * 100))
    : 0;
  const remaining = hasGoal ? Math.max(0, goal.target - goal.read) : 0;

  const startEditing = () => {
    setDraft(String(goal.target));
    setFormError(null);
    setMessage(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setFormError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setMessage(null);

    const cleaned = draft.trim();
    if (!/^[1-9]\d{0,3}$/.test(cleaned) || Number(cleaned) > MAX_TARGET) {
      setFormError(`Entrez un nombre entier entre 1 et ${MAX_TARGET}.`);
      return;
    }

    setSaving(true);
    try {
      await save(Number(cleaned));
      setEditing(false);
      setMessage("Objectif enregistré.");
    } catch (err) {
      // Ce que l'utilisateur a saisi est conservé : il peut réessayer
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(`Supprimer votre objectif de lecture ${year} ?`))
      return;

    setFormError(null);
    setMessage(null);
    setSaving(true);
    try {
      await remove();
      setEditing(false);
      setDraft("");
      setMessage("Objectif supprimé.");
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4">
      {message && (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      )}

      {hasGoal && !editing && (
        <>
          <p className="mb-2">
            <strong>{plural(goal.read, "livre lu")}</strong> sur {goal.target}{" "}
            en {year}
          </p>

          <div className="d-flex align-items-center gap-3 mb-2">
            <div
              className="progress flex-grow-1"
              role="progressbar"
              aria-label={`Progression de l'objectif de lecture ${year}`}
              aria-valuenow={Math.min(goal.read, goal.target)}
              aria-valuemin={0}
              aria-valuemax={goal.target}
            >
              <div
                className="progress-bar"
                style={{ width: `${percent}%` }}
              ></div>
            </div>
            <span className="fw-semibold">{percent} %</span>
          </div>

          <p className="text-secondary mb-3">
            {goal.read > goal.target
              ? `Objectif dépassé : ${plural(goal.read - goal.target, "livre")} de plus que prévu.`
              : goal.read === goal.target
                ? "Objectif atteint, bravo !"
                : `Il vous reste ${plural(remaining, "livre")} à lire cette année.`}
          </p>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={startEditing}
            >
              Modifier l'objectif
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={handleRemove}
              disabled={saving}
            >
              Supprimer l'objectif
            </button>
          </div>
        </>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} noValidate>
          {!hasGoal && goal.read > 0 && (
            <p className="text-secondary">
              Vous avez déjà lu {plural(goal.read, "livre")} en {year}.
            </p>
          )}

          <label htmlFor="goal-target" className="form-label">
            Combien de livres souhaitez-vous lire en {year} ?
          </label>
          <div className="input-group mb-2">
            <input
              id="goal-target"
              type="number"
              inputMode="numeric"
              className="form-control"
              min={1}
              max={MAX_TARGET}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={saving}
            />
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer l'objectif"}
            </button>
            {hasGoal && (
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={cancelEditing}
                disabled={saving}
              >
                Annuler
              </button>
            )}
          </div>
          <div className="form-text">
            Un livre est compté quand vous le classez « Déjà lu » dans votre
            journal.
          </div>

          {formError && (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              {formError}
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default ReadingGoalCard;
