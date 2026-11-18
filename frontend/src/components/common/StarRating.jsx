// frontend/src/components/common/StarRating.jsx
const STARS = [1, 2, 3, 4, 5];

// readOnly : affiche une note. Sinon : saisie au clic (value, onChange).
// Recliquer sur l'étoile déjà choisie retire la note (onChange(null)).
function StarRating({ value, onChange, readOnly = false, label = "Note" }) {
  if (readOnly) {
    return (
      <span
        className="star-display"
        role="img"
        aria-label={`${label} : ${value} sur 5`}
      >
        {"★".repeat(value)}
        {"☆".repeat(5 - value)}
      </span>
    );
  }

  return (
    <div className="d-flex align-items-center" role="group" aria-label={label}>
      {STARS.map((star) => {
        const isOn = value !== null && star <= value;
        return (
          <button
            key={star}
            type="button"
            className={`star-btn ${isOn ? "is-on" : ""}`}
            aria-pressed={value === star}
            aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
            onClick={() => onChange(value === star ? null : star)}
          >
            {isOn ? "★" : "☆"}
          </button>
        );
      })}
    </div>
  );
}

export default StarRating;
