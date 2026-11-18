function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="text-center py-5">
      <h2 className="h5">{title}</h2>
      <p className="text-secondary">{message}</p>
      {actionLabel && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
