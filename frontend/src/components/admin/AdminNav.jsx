// frontend/src/components/admin/AdminNav.jsx
// Onglets de l'espace administrateur : Livres | Auteurs
import { NavLink } from "react-router-dom";

const getTabClass = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;

function AdminNav() {
  return (
    <nav className="nav nav-pills mb-4" aria-label="Espace administrateur">
      <NavLink to="/admin/livres" className={getTabClass}>
        Livres
      </NavLink>
      <NavLink to="/admin/auteurs" className={getTabClass}>
        Auteurs
      </NavLink>
    </nav>
  );
}

export default AdminNav;
