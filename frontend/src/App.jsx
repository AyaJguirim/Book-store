import { Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import CatalogPage from "./pages/CatalogPage";
import FavoritesPage from "./pages/FavoritesPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AccountPage from "./pages/AccountPage";
import NotFoundPage from "./pages/NotFoundPage";
import BookDetailPage from "./pages/BookDetailPage";
import FavoritesNotice from "./components/common/FavoritesNotice";

function App() {
  return (
    <>
      <Navbar />
      <main className="container py-4">
                <FavoritesNotice />
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/favoris" element={<FavoritesPage />} />
          <Route path="/livres/:id" element={<BookDetailPage />} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />

          {/* Pages privées : ProtectedRoute vérifie la connexion, puis affiche la page enfant */}
          <Route element={<ProtectedRoute />}>
            <Route path="/espace" element={<AccountPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
