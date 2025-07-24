import axios from "axios";

// Centralized Axios instance for all secure API requests
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // (https://localhost:4000/api)
  headers: {
    "X-API-KEY": import.meta.env.VITE_API_KEY,
  },
});

export default api;
