import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { validators } from "../validators/authValidators"; 

// Login page that authenticates the user with Strapi
// Stores the JWT in localStorage for later API calls.
export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handles form submission for user login.
  // Sends credentials to the backend proxy and stores the received JWT.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate email and password using central validators
    const emailError = validators.email(email);
    const passwordError = validators.password(password);

    if (emailError || passwordError) {
      setError(emailError || passwordError);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_PROXY_URL}/api/auth/local`,
        {
          identifier: email,
          password: password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Store JWT in localStorage for future authenticated requests
      localStorage.setItem("jwt", response.data.jwt);

      // Navigate to dashboard after successful login
      navigate("/dashboard");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10 bg-gradient-to-br from-[#e0f2fe] via-white to-[#dbeafe]">
      <div className="w-full max-w-[500px] bg-white/70 backdrop-blur-md border border-blue-100 shadow-md rounded-3xl px-8 py-12">
        <h1 className="text-center text-[28px] font-medium text-blue-800 mb-2 tracking-tight">
          Welcome back
        </h1>
        <p className="text-center text-[15px] text-gray-600 mb-6">
          Log in to access your account
        </p>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-4 py-3 rounded-lg mb-6 text-center shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border text-[15px] bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
          />

          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border text-[15px] bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
          />

          <div className="flex justify-between text-sm">
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-blue-600 hover:underline"
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>

            <Link to="/forgot-password" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium text-[15px] shadow-sm hover:shadow-md transition"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-gray-600">
          Don’t have an account?
          <Link
            to="/register"
            className="text-blue-600 font-medium hover:underline ml-1"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
