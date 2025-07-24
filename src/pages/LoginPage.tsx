import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "https://localhost:4000/api/auth/local",
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

      // Save JWT to localStorage
      localStorage.setItem("jwt", response.data.jwt);
      console.log("Login success:", response.data.user);
      navigate("/dashboard"); // or wherever you want
    } catch (err: any) {
      console.error("Login failed:", err);
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
            <span
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-blue-600 cursor-pointer hover:underline"
            >
              {showPassword ? "Hide password" : "Show password"}
            </span>

            <span
              onClick={() => navigate("/forgot-password")}
              className="text-blue-600 cursor-pointer hover:underline"
            >
              Forgot password?
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium text-[15px] shadow-sm hover:shadow-md transition"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-gray-600">
          Don’t have an account?
          <span
            onClick={() => navigate("/register")}
            className="text-blue-600 font-medium cursor-pointer hover:underline ml-1"
          >
            Register here
          </span>
        </p>
      </div>
    </div>
  );
}
