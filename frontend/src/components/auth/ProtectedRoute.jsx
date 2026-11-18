import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Loader from "../common/Loader";

// Entoure les pages privées : sans connexion, on renvoie vers /connexion
function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <Loader label="Vérification de votre session…" />;
  if (!user) return <Navigate to="/connexion" replace />;

  return <Outlet />;
}

export default ProtectedRoute;
