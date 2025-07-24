import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code"); 
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Check token presence on mount
  useEffect(() => {
    if (!code) setError("Lien invalide ou expiré.");
    setIsReady(true);
  }, [code]);

  // Submit new password to API
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/auth/reset-password", {
        code,
        password,
        passwordConfirmation: confirmPassword,
      });

      setSuccess("Mot de passe réinitialisé avec succès !");
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg =
          err.response?.data?.error?.message || "Erreur inattendue. Veuillez réessayer.";
        setError(msg);
      } else {
        setError("Erreur réseau. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e0f2fe] via-white to-[#dbeafe] px-4 py-10">
      <div className="w-full max-w-md bg-white border border-blue-100 shadow-md rounded-3xl px-8 py-10 backdrop-blur-sm animate-fade-in">
        <h1 className="text-2xl font-semibold text-blue-800 text-center mb-2">
          Réinitialiser le mot de passe
        </h1>

        <p className="text-center text-sm text-gray-600 mb-6">
          Choisissez un nouveau mot de passe sécurisé.
        </p>

        {/* Display error if token invalid */}
        {isReady && error && (
          <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-4 py-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        {/* Display form if token valid */}
        {isReady && !error && (
          <>
            {success && (
              <div className="bg-green-50 border border-green-300 text-green-700 text-sm px-4 py-3 rounded-lg mb-4 text-center">
                {success} <br /> Redirection vers la connexion...
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-5">
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                required
              />

              <input
                type="password"
                placeholder="Confirmez le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium text-sm hover:shadow-md transition"
              >
                {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
              </button>
            </form>
          </>
        )}

        {/* Link back to login */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Retour à{" "}
          <span
            onClick={() => navigate("/")}
            className="text-blue-600 font-medium cursor-pointer hover:underline"
          >
            la connexion
          </span>
        </p>
      </div>
    </div>
  );
}
