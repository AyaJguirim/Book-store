function CategoryFilter({ categories, selectedId, onSelect }) {
  return (
    <>
      {/* Mobile : liste déroulante */}
      <div className="d-md-none">
        <label htmlFor="category-select" className="visually-hidden">
          Filtrer par catégorie
        </label>
        <select
          id="category-select"
          className="form-select"
          value={selectedId ?? ""}
          onChange={(event) =>
            onSelect(
              event.target.value === "" ? null : Number(event.target.value),
            )
          }
        >
          <option value="">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Ordinateur : panneau latéral */}
      <nav className="d-none d-md-block" aria-label="Catégories">
        <h2 className="h6 text-uppercase text-secondary mb-3">Catégories</h2>
        <div className="list-group category-list">
          <button
            type="button"
            className={`list-group-item list-group-item-action ${
              selectedId === null ? "active" : ""
            }`}
            aria-pressed={selectedId === null}
            onClick={() => onSelect(null)}
          >
            Toutes
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`list-group-item list-group-item-action ${
                selectedId === category.id ? "active" : ""
              }`}
              aria-pressed={selectedId === category.id}
              onClick={() => onSelect(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

export default CategoryFilter;
