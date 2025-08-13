import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function RequireAuth({ children }: { children: ReactElement }) {
  const { user, loading } = useCurrentUser();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
