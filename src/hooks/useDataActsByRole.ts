import { useEffect, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";
import type { DataAct } from "../types/DataAct";

//Custom React hook to fetch DataAct entries based on the connected user's role
export function useDataActsByRole() {
  const { user, loading: userLoading } = useCurrentUser();
  const [dataActs, setDataActs] = useState<DataAct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait until user info is fully loaded
    if (userLoading || !user) return;

    // Determine the Strapi collection based on the user's role
    const roleName = user.role.name.toLowerCase();
    const collection = roleName === "gbu1" ? "gbus" : `${roleName}s`;

    const endpoint = `https://localhost:4000/api/${collection}`;
    const jwt = localStorage.getItem("jwt");
    if (!jwt) return;

    // Fetch data from the proxy API for the user's assigned GBU
    fetch(endpoint, {
      headers: {
        "X-API-KEY": import.meta.env.VITE_API_KEY,
        Authorization: `Bearer ${jwt}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch GBU data");
        return res.json();
      })
      .then((data) => {
        setDataActs(data.data);
      })
      .catch(() => {
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, userLoading]);

  return { dataActs, loading };
}
