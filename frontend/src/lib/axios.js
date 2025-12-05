// import axios from "axios";

// export const axiosInstance = axios.create({
//   baseURL:
//     import.meta.env.MODE === "development"
//       ? "http://localhost:3000/api"
//       : "/api",
//   withCredentials: true,
// });


// src/lib/axios.js
import axios from "axios";

// Base URL: dev -> localhost:3000 , prod -> same origin
const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000"
    : import.meta.env.VITE_API_BASE_URL || "/";

export const axiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // important: send cookies to server
  timeout: 10000,
});

// Attach Authorization header automatically if token exists in localStorage
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: centralized response/error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // You can do global error handling here (e.g. logout on 401).
    return Promise.reject(error);
  }
);

export default axiosInstance;

