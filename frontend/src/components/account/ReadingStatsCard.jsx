// frontend/src/components/account/ReadingStatsCard.jsx
import Loader from "../common/Loader";
import ErrorMessage from "../common/ErrorMessage";
import { useStats } from "../../hooks/useStats";

const MONTHS = [
  "Janv.",
  "Févr.",
  "Mars",
  "Avr.",
  "Mai",
  "Juin",
  "Juil.",
  "Août",
  "Sept.",
  "Oct.",
  "Nov.",
  "Déc.",
];

function StatTile({ label, value }) {
  return (
    <div className="stat-tile">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ReadingStatsCard({ year }) {
  const { stats, loading, error, reload } = useStats(year);

  let content;
  if (loading) {
    content = <Loader label="Chargement de vos statistiques…" />;
  } else if (error) {
    content = <ErrorMessage message={error} onRetry={reload} />;
  } else {
    // Le plus grand mois sert de 100 % pour la longueur des barres (au moins 1 : évite /0)
    const maxMonth = Math.max(...stats.monthly, 1);
    const average =
      stats.averageRating === null
        ? "—"
        : `${stats.averageRating.toLocaleString("fr-FR")} / 5`;

    content = (
      <>
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-4">
            <StatTile label={`Livres lus en ${year}`} value={stats.readYear} />
          </div>
          <div className="col-6 col-md-4">
            <StatTile label="Livres lus au total" value={stats.readTotal} />
          </div>
          <div className="col-12 col-md-4">
            <StatTile
              label={`Note moyenne (${stats.ratedCount} livre${stats.ratedCount > 1 ? "s" : ""} noté${stats.ratedCount > 1 ? "s" : ""})`}
              value={average}
            />
          </div>
        </div>

        <h3 className="h6">Catégories préférées</h3>
        {stats.topCategories.length === 0 ? (
          <p className="text-secondary">
            Classez des livres en « Déjà lu » pour découvrir vos catégories
            préférées.
          </p>
        ) : (
          <ol className="mb-4">
            {stats.topCategories.map((category) => (
              <li key={category.name}>
                {category.name} —{" "}
                <span className="text-secondary">
                  {category.count} livre{category.count > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ol>
        )}

        <h3 className="h6">Lecture par mois en {year}</h3>
        <ul className="list-unstyled mb-0">
          {stats.monthly.map((count, index) => (
            <li className="month-row" key={MONTHS[index]}>
              <span className="month-label">{MONTHS[index]}</span>
              <div className="month-track" aria-hidden="true">
                <div
                  className="month-bar"
                  style={{ width: `${(count / maxMonth) * 100}%` }}
                />
              </div>
              <span className="month-count">
                {count}
                <span className="visually-hidden"> livre(s) lu(s)</span>
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <section id="stats" className="mb-5" aria-labelledby="stats-title">
      <h2 id="stats-title" className="h5 mb-3">
        Mes statistiques de lecture
      </h2>
      <div className="card p-4">{content}</div>
    </section>
  );
}

export default ReadingStatsCard;
