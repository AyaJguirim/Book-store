function ErrorMessage({ message, onRetry }) {
  return (
    <div className="alert alert-danger text-center" role="alert">
      <p className="mb-3">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
