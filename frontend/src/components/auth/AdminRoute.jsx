import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Loader from "../common/Loader";

// Entoure les pages d'administration : connexion + rôle admin exigés.
// Ce contrôle ne sert qu'à l'affichage : le serveur refuse de toute façon (403)
// toute action d'administration faite par un compte qui n'est pas admin.
function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return <Loader label="Vérification de votre session…" />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return <Outlet />;
}

export default AdminRoute;
