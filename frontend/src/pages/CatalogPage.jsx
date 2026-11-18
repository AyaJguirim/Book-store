import { useState } from "react";
import BookGrid from "../components/books/BookGrid";
import SearchBar from "../components/filters/SearchBar";
import CategoryFilter from "../components/filters/CategoryFilter";
import EmptyState from "../components/common/EmptyState";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { useBooks } from "../hooks/useBooks";
import { useCategories } from "../hooks/useCategories";
import { useDebounce } from "../hooks/useDebounce";

function CatalogPage() {
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // La saisie est retardée de 300 ms avant d'être envoyée à l'API
  // (trim : taper un espace en fin de mot ne relance pas de requête)
  const debouncedSearch = useDebounce(search.trim(), 300);

  const { books, loading, error, reload } = useBooks({
    search: debouncedSearch,
    categoryId: selectedCategoryId,
  });
  const { categories } = useCategories();

  // Basé sur la recherche réellement envoyée, pour rester cohérent avec les résultats affichés
  const hasFilters = debouncedSearch !== "" || selectedCategoryId !== null;

  const resetFilters = () => {
    setSearch("");
    setSelectedCategoryId(null);
  };

  // Une seule des trois vues est affichée : chargement, erreur ou résultat
  let content;
  if (loading) {
    content = <Loader label="Chargement des livres…" />;
  } else if (error) {
    content = <ErrorMessage message={error} onRetry={reload} />;
  } else if (books.length === 0) {
    content = hasFilters ? (
      <EmptyState
        title="Aucun livre trouvé"
        message="Aucun livre ne correspond à votre recherche ou à la catégorie choisie."
        actionLabel="Réinitialiser"
        onAction={resetFilters}
      />
    ) : (
      <EmptyState
        title="Le catalogue est vide"
        message="Aucun livre n'est disponible pour le moment."
      />
    );
  } else {
    content = <BookGrid books={books} />;
  }

  return (
    <div>
      <h1 className="h3 mb-4">Catalogue</h1>

      <div className="row g-4">
        <aside className="col-12 col-md-4 col-lg-3">
          <CategoryFilter
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />
        </aside>

        <section className="col-12 col-md-8 col-lg-9">
          <div className="row g-3 align-items-center mb-4">
            <div className="col-12 col-lg-7">
              <SearchBar value={search} onChange={setSearch} />
            </div>
            <div className="col-12 col-lg-5 text-lg-end text-secondary">
              {!loading && !error && (
                <>
                  {books.length} livre{books.length > 1 ? "s" : ""}
                </>
              )}
            </div>
          </div>

          {content}
        </section>
      </div>
    </div>
  );
}

export default CatalogPage;
