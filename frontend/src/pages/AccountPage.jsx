// frontend/src/pages/AccountPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BookGrid from "../components/books/BookGrid";
import NoteCard from "../components/books/NoteCard";
import AccountSidebar from "../components/account/AccountSidebar";
import ReadingGoalCard from "../components/account/ReadingGoalCard";
import EmptyState from "../components/common/EmptyState";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { useAuth } from "../hooks/useAuth";
import { useFavorites } from "../hooks/useFavorites";
import { useRecentViews } from "../hooks/useRecentViews";
import { useReadingLog } from "../hooks/useReadingLog";
import { useNotes } from "../hooks/useNotes";
import { getErrorMessage } from "../utils/getErrorMessage";
import { READING_STATUSES } from "../utils/readingStatuses";
// frontend/src/pages/AccountPage.jsx
import ReadingStatsCard from "../components/account/ReadingStatsCard";
import FavoriteBooksSection from "../components/account/FavoriteBooksSection";
function AccountPage() {
  const { user } = useAuth();
  const { count: favoritesCount } = useFavorites();
  const navigate = useNavigate();

  const recent = useRecentViews();
  const journal = useReadingLog();
  const notes = useNotes();

  // L'objectif concerne l'année en cours
  const year = new Date().getFullYear();

  const [activeStatus, setActiveStatus] = useState("reading");
  const [clearError, setClearError] = useState(null);

  const handleClear = async () => {
    setClearError(null);
    try {
      await recent.clear();
    } catch (err) {
      setClearError(getErrorMessage(err));
    }
  };

  // ----- Journal de lecture -----
  const activeLabel = READING_STATUSES.find(
    (item) => item.value === activeStatus,
  ).label;
  const activeEntries = journal.entries.filter(
    (entry) => entry.status === activeStatus,
  );

  // Compteurs par statut : null tant que le journal n'est pas chargé (ou en cas d'erreur)
  const statusCounts =
    journal.loading || journal.error
      ? null
      : Object.fromEntries(
          READING_STATUSES.map((item) => [
            item.value,
            journal.entries.filter((entry) => entry.status === item.value)
              .length,
          ]),
        );

  let journalContent;
  if (journal.loading) {
    journalContent = <Loader label="Chargement de votre journal…" />;
  } else if (journal.error) {
    journalContent = (
      <ErrorMessage message={journal.error} onRetry={journal.reload} />
    );
  } else if (activeEntries.length === 0) {
    journalContent = (
      <EmptyState
        title={`Aucun livre dans « ${activeLabel} »`}
        message="Ouvrez la fiche d'un livre pour le classer dans votre journal."
        actionLabel="Voir le catalogue"
        onAction={() => navigate("/")}
      />
    );
  } else {
    journalContent = <BookGrid books={activeEntries} />;
  }

  // ----- Mes notes -----
  let notesContent;
  if (notes.loading) {
    notesContent = <Loader label="Chargement de vos notes…" />;
  } else if (notes.error) {
    notesContent = (
      <ErrorMessage message={notes.error} onRetry={notes.reload} />
    );
  } else if (notes.entries.length === 0) {
    notesContent = (
      <EmptyState
        title="Aucune note pour le moment"
        message="Ouvrez la fiche d'un livre pour le noter ou écrire un commentaire."
        actionLabel="Voir le catalogue"
        onAction={() => navigate("/")}
      />
    );
  } else {
    notesContent = (
      <div className="row g-3">
        {notes.entries.map((note) => (
          <div className="col-12 col-xl-6" key={note.id}>
            <NoteCard note={note} />
          </div>
        ))}
      </div>
    );
  }

  // ----- Consultés récemment -----
  let recentContent;
  if (recent.loading) {
    recentContent = <Loader label="Chargement de votre historique…" />;
  } else if (recent.error) {
    recentContent = (
      <ErrorMessage message={recent.error} onRetry={recent.reload} />
    );
  } else if (recent.books.length === 0) {
    recentContent = (
      <EmptyState
        title="Aucun livre consulté"
        message="Les livres dont vous ouvrez la fiche apparaîtront ici."
        actionLabel="Voir le catalogue"
        onAction={() => navigate("/")}
      />
    );
  } else {
    recentContent = <BookGrid books={recent.books} />;
  }

  return (
    <div>
      <h1 className="h3 mb-1">Mon espace</h1>
      <p className="text-secondary mb-4">
        Bonjour {user.name} ({user.email})
      </p>

      <div className="row g-4">
        {/* Colonne de droite : liste de navigation (cachée sous 992 px) */}
        <aside className="d-none d-lg-block col-lg-4 col-xl-3 order-lg-2">
          <AccountSidebar
            year={year}
            statusCounts={statusCounts}
            activeStatus={activeStatus}
            onSelectStatus={setActiveStatus}
            notesCount={
              notes.loading || notes.error ? null : notes.entries.length
            }
            favoritesCount={favoritesCount}
            recentCount={
              recent.loading || recent.error ? null : recent.books.length
            }
          />
        </aside>

        {/* Colonne principale */}
        <div className="col-12 col-lg-8 col-xl-9 order-lg-1">
          <section id="goal" className="mb-5" aria-labelledby="goal-title">
            <h2 id="goal-title" className="h5 mb-3">
              Objectif de lecture {year}
            </h2>

            <ReadingGoalCard year={year} />
            <ReadingStatsCard year={year} />
          </section>

          <section
            id="journal"
            className="mb-5"
            aria-labelledby="journal-title"
          >
            <h2 id="journal-title" className="h5 mb-3">
              Journal de lecture
            </h2>

            <div
              className="d-flex flex-wrap gap-2 mb-4"
              role="group"
              aria-label="Statut de lecture"
            >
              {READING_STATUSES.map((item) => {
                const isActive = item.value === activeStatus;
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={`btn btn-sm btn-outline-primary ${isActive ? "active" : ""}`}
                    aria-pressed={isActive}
                    onClick={() => setActiveStatus(item.value)}
                  >
                    {item.label}
                    {statusCounts && ` (${statusCounts[item.value]})`}
                  </button>
                );
              })}
            </div>

            {journalContent}
          </section>

          <section id="notes" className="mb-5" aria-labelledby="notes-title">
            <h2 id="notes-title" className="h5 mb-3">
              Mes notes
              {!notes.loading && !notes.error && ` (${notes.entries.length})`}
            </h2>

            {notesContent}
          </section>
          <FavoriteBooksSection />
          <section id="recent" className="mb-5" aria-labelledby="recent-title">
            <div className="d-flex justify-content-between align-items-baseline mb-3">
              <h2 id="recent-title" className="h5 mb-0">
                Consultés récemment
              </h2>
              {!recent.loading && !recent.error && recent.books.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={handleClear}
                >
                  Vider l'historique
                </button>
              )}
            </div>

            {clearError && (
              <div className="alert alert-danger" role="alert">
                {clearError}
              </div>
            )}

            {recentContent}
          </section>
        </div>
      </div>
    </div>
  );
}

export default AccountPage;
