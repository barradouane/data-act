import axios from "axios";

// Centralized Axios instance for all secure API requests
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "X-API-KEY": import.meta.env.VITE_API_KEY,
  },
});

export default api;