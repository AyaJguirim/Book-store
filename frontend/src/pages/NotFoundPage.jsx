import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="text-center py-5">
      <h1 className="display-4">404</h1>
      <p className="lead">Cette page est introuvable.</p>
      <Link to="/" className="btn btn-primary">
        Retour au catalogue
      </Link>
    </div>
  );
}

export default NotFoundPage;
