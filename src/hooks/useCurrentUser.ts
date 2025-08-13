import { useEffect, useState } from "react";

// Type representing a Strapi role object
interface Role {
  name: string;
}

// Type representing the user object returned by /api/me
interface ApiUser {
  id: number;
  username: string;
  email: string;
  role: Role;
}

//Custom React hook to retrieve the currently authenticated user
//based on the JWT stored in localStorage.

export function useCurrentUser() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) {
      setLoading(false);
      return;
    }

    // Fetch the current user from the backend proxy
    fetch(`${import.meta.env.VITE_PROXY_URL}/api/me`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        "X-API-KEY": import.meta.env.VITE_API_KEY,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        setUser(data);
      })
      .catch(() => {
        setError("Invalid session");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { user, loading, error };
}
