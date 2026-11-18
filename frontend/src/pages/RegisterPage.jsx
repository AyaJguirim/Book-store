import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../utils/getErrorMessage";

function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/espace" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await register(name.trim(), email.trim(), password);
      navigate("/espace", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-5">
        <h1 className="h3 mb-4 text-center">Créer un compte</h1>

        <form className="card p-4" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="register-name" className="form-label">
              Nom
            </label>
            <input
              id="register-name"
              type="text"
              className="form-control"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={100}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="register-email" className="form-label">
              Adresse e-mail
            </label>
            <input
              id="register-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="register-password" className="form-label">
              Mot de passe
            </label>
            <input
              id="register-password"
              type="password"
              className="form-control"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <div className="form-text">8 caractères minimum.</div>
          </div>

          <div className="mb-3">
            <label htmlFor="register-confirm" className="form-label">
              Confirmer le mot de passe
            </label>
            <input
              id="register-confirm"
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={submitting}
          >
            {submitting ? "Création du compte…" : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-secondary mt-3 mb-0">
          Déjà un compte ? <Link to="/connexion">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
