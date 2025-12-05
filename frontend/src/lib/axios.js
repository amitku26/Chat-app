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

// PROPER BASE URL
const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000" // local backend
    : "https://chat-app-wlqa.onrender.com"; // production backend

export const axiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`, // FULL FIX
  withCredentials: true, // allow cookies (JWT)
  timeout: 10000,
});

// Attach Authorization token automatically
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Centralized error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default axiosInstance;


