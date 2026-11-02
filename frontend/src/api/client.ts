import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const apiClient = axios.create({ baseURL: API_URL });

// Attach JWT from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("cs_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiClient;
