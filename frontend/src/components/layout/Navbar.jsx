import { Link, NavLink, useNavigate } from "react-router-dom";
import { useFavorites } from "../../hooks/useFavorites";
import { useAuth } from "../../hooks/useAuth";

function Navbar() {
  const { count } = useFavorites();
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  // Fonction appelée par NavLink : isActive vaut true si l'URL correspond au lien
  const getLinkClass = ({ isActive }) =>
    isActive ? "nav-link active fw-semibold" : "nav-link";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-md bg-white border-bottom">
      <div className="container">
        <Link to="/" className="navbar-brand fw-bold">
          Book Store
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-controls="mainNav"
          aria-expanded="false"
          aria-label="Afficher le menu"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav ms-auto align-items-md-center">
            <li className="nav-item">
              <NavLink to="/" end className={getLinkClass}>
                Catalogue
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/favoris" className={getLinkClass}>
                Mes favoris{" "}
                <span className="badge text-bg-secondary">{count}</span>
              </NavLink>
            </li>

            {/* Rien n'est affiché pendant la vérification de la session (évite un clignotement) */}
            {!loading &&
              (user ? (
                <>
                  <li className="nav-item">
                    <NavLink to="/espace" className={getLinkClass}>
                      Mon espace
                    </NavLink>
                  </li>
                  {user.role === "admin" && (
                    <li className="nav-item">
                      <NavLink to="/admin/livres" className={getLinkClass}>
                        Administration
                      </NavLink>
                    </li>
                  )}
                  <li className="nav-item ms-md-2 mt-2 mt-md-0">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={handleLogout}
                    >
                      Déconnexion
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item ms-md-2 mt-2 mt-md-0">
                    <Link
                      to="/connexion"
                      className="btn btn-outline-primary btn-sm"
                    >
                      Se connecter
                    </Link>
                  </li>
                  <li className="nav-item ms-md-2 mt-2 mt-md-0">
                    <Link to="/inscription" className="btn btn-primary btn-sm">
                      Créer un compte
                    </Link>
                  </li>
                </>
              ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
