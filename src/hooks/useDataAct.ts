import { useEffect, useState } from "react";
import { type DataAct } from "../types/DataAct";

// Custom hook to fetch DataAct entries from the backend proxy
export function useDataActs() {
  const [dataActs, setDataActs] = useState<DataAct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Send GET request to secure proxy (Express server)
    fetch("https://localhost:4000/api/data-acts", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": import.meta.env.VITE_API_KEY, // API key passed via env variable
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch data: " + res.status);
        }
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
  }, []);

  return { dataActs, loading };
}
