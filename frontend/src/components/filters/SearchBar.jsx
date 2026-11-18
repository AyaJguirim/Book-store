function SearchBar({ value, onChange }) {
  return (
    <div>
      <label htmlFor="book-search" className="visually-hidden">
        Rechercher un livre par titre
      </label>
      <div className="input-group">
        <input
          id="book-search"
          type="search"
          className="form-control"
          placeholder="Rechercher un livre par titre…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {value && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => onChange("")}
            aria-label="Effacer la recherche"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
