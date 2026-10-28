import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "https://nettutorai-computer-network-instructor-1-2ehb.onrender.com/api" });
api.interceptors.request.use(config => {
  const token = localStorage.getItem("nettutor_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export default api;
