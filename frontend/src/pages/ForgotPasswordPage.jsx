// frontend/src/pages/ForgotPasswordPage.jsx
// Étape 1 : l'utilisateur saisit son e-mail pour recevoir un lien de réinitialisation.
import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/authService";
import { getErrorMessage } from "../utils/getErrorMessage";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState(null); // rempli quand la demande est partie

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      setSentMessage(await forgotPassword(email.trim()));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-5">
        <h1 className="h3 mb-4 text-center">Mot de passe oublié</h1>

        {sentMessage ? (
          <div className="card p-4">
            <div className="alert alert-success" role="status">
              {sentMessage}
            </div>
            <p className="text-secondary small">
              Le lien est valable 1 heure. Pensez à vérifier vos courriers
              indésirables. Si rien n'arrive, vous pourrez refaire une demande
              dans une minute.
            </p>
            <Link to="/connexion" className="btn btn-primary">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form className="card p-4" onSubmit={handleSubmit}>
            <p className="text-secondary">
              Saisissez l'adresse e-mail de votre compte : nous vous enverrons
              un lien pour choisir un nouveau mot de passe.
            </p>

            <div className="mb-3">
              <label htmlFor="forgot-email" className="form-label">
                Adresse e-mail
              </label>
              <input
                id="forgot-email"
                type="email"
                className="form-control"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
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
              {submitting ? "Envoi…" : "Envoyer le lien"}
            </button>
          </form>
        )}

        {!sentMessage && (
          <p className="text-center text-secondary mt-3 mb-0">
            <Link to="/connexion">← Retour à la connexion</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
