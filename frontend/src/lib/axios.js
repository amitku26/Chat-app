import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:9002/api"
      : "/api",
  withCredentials: true,
});
