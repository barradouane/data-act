import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Page to request a password reset by providing an email address
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Handle form submission to send reset link
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await axios.post("/api/auth/forgot-password", { email });
      setMessage("Check your email for a reset link.");
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
        "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e0f2fe] via-white to-[#dbeafe] px-4 py-10">
      <div className="w-full max-w-md bg-white border border-blue-100 shadow-md rounded-3xl px-8 py-10 backdrop-blur-sm animate-fade-in">
        {/* Title */}
        <h1 className="text-2xl font-semibold text-blue-800 text-center mb-2">
          Forgot Password
        </h1>

        <p className="text-center text-sm text-gray-600 mb-6">
          Enter your email and we’ll send you a reset link.
        </p>

        {/* Success message */}
        {message && (
          <div className="bg-green-50 border border-green-300 text-green-700 text-sm px-4 py-3 rounded-lg mb-4 text-center">
            {message}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-4 py-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        {/* Reset form */}
        <form onSubmit={handleForgotPassword} className="space-y-5">
          <input
            type="email"
            required
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium text-sm hover:shadow-md transition"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {/* Link to login */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Remember your password?{" "}
          <span
            onClick={() => navigate("/")}
            className="text-blue-600 font-medium cursor-pointer hover:underline"
          >
            Log in here
          </span>
        </p>
      </div>
    </div>
  );
}
