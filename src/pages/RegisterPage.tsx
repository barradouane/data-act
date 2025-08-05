import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { validators } from "../validators/authValidators"; // ✅ Externalized validation logic

// Interface for the registration form structure
interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  gbu: string;
}

// List of GBU role options
const GBU_OPTIONS = ["GBU1", "GBU2", "GBU3", "GBU4"];

// Registration page that creates a new user account and assigns them to a selected GBU role.
export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterForm>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    gbu: "",
  });

  const [formErrors, setFormErrors] = useState<Partial<RegisterForm>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof RegisterForm, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field validation rules
  const validateField = (name: keyof RegisterForm, value: string) =>
    validators[name](value, formData);

  // Handle field changes and trigger validation
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target as { name: keyof RegisterForm; value: string };
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    setError("");
  };

  const isFormValid = () => {
    return (
      Object.values(formErrors).every((err) => !err) &&
      Object.values(formData).every((val) => val.trim() !== "")
    );
  };

  // Extract readable error message from an Axios error
  const extractErrorMessage = (err: any): string => {
    if (axios.isAxiosError(err)) {
      return (
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        "Unknown registration error."
      );
    }
    return "Network or unknown error.";
  };

  // Handles the registration form submission.
  // Sends user credentials and selected GBU to the backend.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setIsSubmitting(true);

    try {
      await axios.post(
        "https://localhost:4000/api/auth/local/register",
        {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          gbu: formData.gbu,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": import.meta.env.VITE_API_KEY,
          },
        }
      );

      // Reset error message if form succeeds
      setError("");
      setSuccess("Account created! Please check your email to confirm your account.");
      setFormData({ username: "", email: "", password: "", confirmPassword: "", gbu: "" });
      setFormErrors({});
      setTouched({});
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-[#e0f2fe] via-white to-[#dbeafe]">
      <div className="w-full max-w-[500px] bg-white/70 backdrop-blur-md border border-blue-100 shadow-md rounded-3xl px-8 py-12">
        <h1 className="text-center text-2xl font-semibold text-blue-800 mb-2 tracking-tight">
          Create your account
        </h1>
        <p className="text-center text-sm text-gray-600 mb-6">
          Sign up to get started with the platform
        </p>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

        {success ? (
          <div className="text-center space-y-6">
            <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm shadow-sm">
              {success}
            </div>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-xl bg-white text-blue-700 border border-blue-300 hover:border-blue-400 hover:text-blue-800 transition font-medium text-sm shadow-sm"
            >
              Go to login page
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {(["username", "email", "password", "confirmPassword"] as (keyof RegisterForm)[]).map((field) => (
              <div key={field}>
                <input
                  required
                  id={field}
                  type={field.includes("password") ? (showPassword ? "text" : "password") : field}
                  name={field}
                  placeholder={field === "confirmPassword" ? "Confirm password" : field.charAt(0).toUpperCase() + field.slice(1)}
                  value={formData[field]}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 transition ${
                    formErrors[field]
                      ? "border-red-500 focus:ring-red-300"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {formErrors[field] && touched[field] && (
                  <p className="text-xs text-red-500 mt-1 ml-1">{formErrors[field]}</p>
                )}
              </div>
            ))}

            {/* GBU selection dropdown */}
            <div>
              <select
                required
                name="gbu"
                value={formData.gbu}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 ${
                  formErrors.gbu
                    ? "border-red-500 focus:ring-red-300"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              >
                <option value="">Select your GBU</option>
                {GBU_OPTIONS.map((gbu) => (
                  <option key={gbu} value={gbu}>
                    {gbu}
                  </option>
                ))}
              </select>
              {formErrors.gbu && touched.gbu && (
                <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.gbu}</p>
              )}
            </div>

            <div
              className="text-sm text-right text-blue-600 cursor-pointer hover:underline"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide password" : "Show password"}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isFormValid()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium text-sm shadow-sm hover:shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? "Creating account..." : "Sign up"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
