function Loader({ label = "Chargement…" }) {
  return (
    <div className="text-center py-5" role="status">
      <div className="spinner-border text-primary" aria-hidden="true"></div>
      <p className="text-secondary mt-3 mb-0">{label}</p>
    </div>
  );
}

export default Loader;
