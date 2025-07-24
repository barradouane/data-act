import { useNavigate } from "react-router-dom";

// Page displayed after successful email confirmation
export default function ConfirmEmailPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#e0f2fe] via-white to-[#dbeafe] px-4 py-10">
      <div className="w-full max-w-[460px] bg-white/70 backdrop-blur-md border border-blue-100 shadow-md rounded-3xl px-8 py-12">
        {/* Title */}
        <h1 className="text-center text-2xl font-semibold text-blue-800 mb-4 tracking-tight">
          Email confirmed
        </h1>

        {/* Description */}
        <p className="text-center text-sm text-gray-700 mb-8">
          Your email address has been successfully verified.
        </p>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-5 py-4 rounded-lg mb-8 text-center shadow-sm">
          <p className="text-sm">You can now log in to your account.</p>
        </div>

        {/* Navigation button */}
        <button
          onClick={() => navigate("/")}
          className="w-full py-3 rounded-xl bg-white text-blue-700 border border-blue-300 hover:border-blue-400 hover:text-blue-800 transition font-medium text-sm shadow-sm"
        >
          Go to login page
        </button>
      </div>
    </div>
  );
}
