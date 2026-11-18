// frontend/src/components/account/AccountSidebar.jsx
import { Link } from "react-router-dom";
import { READING_STATUSES } from "../../utils/readingStatuses";

const ITEM_CLASS =
  "list-group-item list-group-item-action d-flex justify-content-between align-items-center";

// Fait défiler la page jusqu'à une section (sans animation si l'utilisateur l'a désactivée)
function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  target.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });
}

// Un compteur est masqué (null) tant que la donnée n'est pas chargée
function Count({ value }) {
  if (value === null || value === undefined) return null;
  return <span className="badge rounded-pill">{value}</span>;
}

function AccountSidebar({
  year,
  statusCounts,
  activeStatus,
  onSelectStatus,
  notesCount,
  favoritesCount,
  recentCount,
}) {
  const handleStatus = (status) => {
    onSelectStatus(status);
    scrollToSection("journal");
  };

  return (
    <nav className="account-sidebar" aria-label="Sections de mon espace">
      <div className="account-nav">
        <p className="account-nav-title" id="nav-goal-title">
          Objectif de lecture {year}
        </p>
        <div
          className="list-group list-group-flush"
          role="group"
          aria-labelledby="nav-goal-title"
        >
          <button
            type="button"
            className={ITEM_CLASS}
            onClick={() => scrollToSection("goal")}
          >
            Mon objectif {year}
          </button>
        </div>
        <p className="account-nav-title" id="nav-journal-title">
          Journal de lecture
        </p>
        <div
          className="list-group list-group-flush"
          role="group"
          aria-labelledby="nav-journal-title"
        >
          {READING_STATUSES.map((item) => {
            const isActive = item.value === activeStatus;
            return (
              <button
                key={item.value}
                type="button"
                className={`${ITEM_CLASS} ${isActive ? "active" : ""}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => handleStatus(item.value)}
              >
                {item.label}
                <Count value={statusCounts ? statusCounts[item.value] : null} />
              </button>
            );
          })}
        </div>
        <div
          className="list-group list-group-flush"
          role="group"
          aria-labelledby="nav-activity-title"
        >
          <button
            type="button"
            className={ITEM_CLASS}
            onClick={() => scrollToSection("stats")}
          >
            Mes statistiques de lecture
          </button>
          <button
            type="button"
            className={ITEM_CLASS}
            onClick={() => scrollToSection("notes")}
          >
            Mes notes
            <Count value={notesCount} />
          </button>
          <button
            type="button"
            className={ITEM_CLASS}
            onClick={() => scrollToSection("favorites")}
          >
            Mes livres favoris
            <Count value={favoritesCount} />
          </button>
          <button
            type="button"
            className={ITEM_CLASS}
            onClick={() => scrollToSection("recent")}
          >
            Consultés récemment
            <Count value={recentCount} />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default AccountSidebar;
