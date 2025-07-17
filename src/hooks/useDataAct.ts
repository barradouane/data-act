import { useEffect, useState } from "react";
import { type DataAct } from "../types/DataAct";

//Custom hook to fetch and manage DataAct entries from the secure HTTPS proxy.
 
export function useDataActs() {
  const [dataActs, setDataActs] = useState<DataAct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data from secure backend (via HTTPS proxy)
    fetch("https://localhost:4000/api/data-acts", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": import.meta.env.VITE_API_KEY, 
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("HTTP error " + res.status);
        }
        return res.json(); 
      })
      .then((data) => {
        setDataActs(data.data); 
        console.log("Data received successfully:", data.data);
      })
      .catch((err) => {
        // Log error details
        console.error("Failed to fetch data:", err);
      })
      .finally(() => {
        setLoading(false); 
      });
  }, []);


  return { dataActs, loading };
}
