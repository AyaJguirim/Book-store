import { Suspense, lazy } from "react";
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
import AdminRoute from "./components/auth/AdminRoute";
import Loader from "./components/common/Loader";
import AdminBooksPage from "./pages/admin/AdminBooksPage";
import AdminBookFormPage from "./pages/admin/AdminBookFormPage";
import AuthorsPage from "./pages/AuthorsPage";
import AuthorDetailPage from "./pages/AuthorDetailPage";
import AdminAuthorsPage from "./pages/admin/AdminAuthorsPage";
import AdminAuthorFormPage from "./pages/admin/AdminAuthorFormPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
// Chargé à la demande : la bibliothèque PDF n'alourdit pas le reste du site
const ReaderPage = lazy(() => import("./pages/ReaderPage"));

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
          <Route path="/auteurs" element={<AuthorsPage />} />
          <Route path="/auteurs/:id" element={<AuthorDetailPage />} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
          <Route
            path="/reinitialiser-mot-de-passe"
            element={<ResetPasswordPage />}
          />
          {/* Pages privées : ProtectedRoute vérifie la connexion, puis affiche la page enfant */}
          <Route element={<ProtectedRoute />}>
            <Route path="/espace" element={<AccountPage />} />
            <Route
              path="/livres/:id/lire"
              element={
                <Suspense fallback={<Loader label="Chargement du lecteur…" />}>
                  <ReaderPage />
                </Suspense>
              }
            />
          </Route>

          {/* Pages réservées à l'administrateur */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/livres" element={<AdminBooksPage />} />
            <Route
              path="/admin/livres/nouveau"
              element={<AdminBookFormPage />}
            />
            <Route
              path="/admin/livres/:id/modifier"
              element={<AdminBookFormPage />}
            />
            <Route path="/admin/auteurs" element={<AdminAuthorsPage />} />
            <Route
              path="/admin/auteurs/nouveau"
              element={<AdminAuthorFormPage />}
            />
            <Route
              path="/admin/auteurs/:id/modifier"
              element={<AdminAuthorFormPage />}
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
