// frontend/src/pages/ResetPasswordPage.jsx
// Étape 2 : page ouverte depuis le lien de l'e-mail (/reinitialiser-mot-de-passe?token=...).
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PasswordInput from "../components/auth/PasswordInput";
import { resetPassword } from "../services/authService";
import { getErrorMessage } from "../utils/getErrorMessage";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const tokenLooksValid = /^[0-9a-f]{64}$/.test(token); // un jeton fait toujours 64 caractères

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Mêmes règles que l'inscription (le serveur les revérifie de toute façon)
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("Le mot de passe est trop long (72 octets maximum).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      setDoneMessage(await resetPassword({ token, password }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  let content;
  if (doneMessage) {
    content = (
      <div className="card p-4">
        <div className="alert alert-success" role="status">
          {doneMessage}
        </div>
        <Link to="/connexion" className="btn btn-primary">
          Se connecter
        </Link>
      </div>
    );
  } else if (!tokenLooksValid) {
    content = (
      <div className="card p-4">
        <div className="alert alert-danger" role="alert">
          Ce lien est invalide. Refaites une demande de réinitialisation.
        </div>
        <Link to="/mot-de-passe-oublie" className="btn btn-primary">
          Refaire une demande
        </Link>
      </div>
    );
  } else {
    content = (
      <form className="card p-4" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="reset-password" className="form-label">
            Nouveau mot de passe
          </label>
          <PasswordInput
            id="reset-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
          <div className="form-text">8 caractères minimum.</div>
        </div>

        <div className="mb-3">
          <label htmlFor="reset-confirm" className="form-label">
            Confirmer le mot de passe
          </label>
          <PasswordInput
            id="reset-confirm"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
            {/* Lien expiré ou déjà utilisé : on propose directement d'en demander un autre */}
            {error.includes("lien") && (
              <>
                {" "}
                <Link to="/mot-de-passe-oublie">Refaire une demande</Link>
              </>
            )}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={submitting}
        >
          {submitting ? "Enregistrement…" : "Enregistrer le mot de passe"}
        </button>
      </form>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-5">
        <h1 className="h3 mb-4 text-center">Nouveau mot de passe</h1>
        {content}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
