// import { create } from "zustand";
// import { axiosInstance } from "../lib/axios.js";
// import toast from "react-hot-toast";
// import { io } from "socket.io-client";

// const BASE_URL =
//   import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

// export const useAuthStore = create((set, get) => ({
//   authUser: null,
//   isSigningUp: false,
//   isLoggingIn: false,
//   isUpdatingProfile: false,
//   isCheckingAuth: true,
//   onlineUsers: [],
//   socket: null,

//   checkAuth: async () => {
//     try {
//       const res = await axiosInstance.get("/auth/check");

//       set({ authUser: res.data });
//       get().connectSocket();
//     } catch (error) {
//       console.log("Error in checkAuth:", error);
//       set({ authUser: null });
//     } finally {
//       set({ isCheckingAuth: false });
//     }
//   },

//   signup: async (data) => {
//     set({ isSigningUp: true });
//     try {
//       const res = await axiosInstance.post("/auth/signup", data);
//       set({ authUser: res.data });
//       toast.success("Account created successfully");
//       get().connectSocket();
//     } catch (error) {
//       toast.error(error.response.data.message);
//     } finally {
//       set({ isSigningUp: false });
//     }
//   },

//   login: async (data) => {
//     set({ isLoggingIn: true });
//     try {
//       const res = await axiosInstance.post("/auth/login", data);
//       set({ authUser: res.data });
//       toast.success("Logged in successfully");

//       get().connectSocket();
//     } catch (error) {
//       toast.error(error.response.data.message);
//     } finally {
//       set({ isLoggingIn: false });
//     }
//   },

//   logout: async () => {
//     try {
//       await axiosInstance.post("/auth/logout");
//       set({ authUser: null });
//       toast.success("Logged out successfully");
//       get().disconnectSocket();
//     } catch (error) {
//       toast.error(error.response.data.message);
//     }
//   },

//   updateProfile: async (data) => {
//     set({ isUpdatingProfile: true });
//     try {
//       const res = await axiosInstance.put("/auth/update-profile", data);
//       set({ authUser: res.data });
//       toast.success("Profile updated successfully");
//     } catch (error) {
//       console.log("error in update profile:", error);
//       toast.error(error.response.data.message);
//     } finally {
//       set({ isUpdatingProfile: false });
//     }
//   },

//   connectSocket: () => {
//     const { authUser } = get();
//     if (!authUser || get().socket?.connected) return;

//     const socket = io(BASE_URL, {
//       query: {
//         userId: authUser._id,
//       },
//     });
//     socket.connect();

//     set({ socket: socket });

//     socket.on("getOnlineUsers", (userIds) => {
//       set({ onlineUsers: userIds });
//     });
//   },
//   disconnectSocket: () => {
//     if (get().socket?.connected) get().socket.disconnect();
//   },
// }));

// src/stores/useAuthStore.js
import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const API_BASE =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000"
    : import.meta.env.VITE_API_BASE_URL || "/";

// SOCKET URL: optionally set VITE_SOCKET_URL in prod if sockets hosted separately
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE;

export const useAuthStore = create((set, get) => ({
  authUser: null,
  token: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  // Helper: safe error message extraction
  _getErrorMessage: (err) =>
    err?.response?.data?.message || err?.message || "Something went wrong",

  // ---- Check auth on app start ----
  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      // axiosInstance already attaches Authorization header from localStorage
      const res = await axiosInstance.get("/auth/check");

      // backend may return user directly or { user: user }
      const user = res?.data?.user ?? res?.data ?? null;
      if (user) {
        // If token exists in response, store it. If not, keep existing token.
        const tokenFromResponse = res?.data?.token;
        if (tokenFromResponse) {
          localStorage.setItem("token", tokenFromResponse);
          set({ token: tokenFromResponse });
        } else {
          // if no token in response but localStorage had token already, keep it
          const existingToken = localStorage.getItem("token");
          set({ token: existingToken || null });
        }

        set({ authUser: user });
        get().connectSocket();
      } else {
        // No user returned -> unauthenticated
        set({ authUser: null, token: null });
        localStorage.removeItem("token");
      }
    } catch (error) {
      // 401/403 or network error -> unauthenticated
      console.log("Error in checkAuth:", error);
      set({ authUser: null, token: null });
      localStorage.removeItem("token");
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // ---- Signup ----
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);

      // backend returns { user, token } or directly user object in res.data
      const user = res?.data?.user ?? res?.data ?? null;
      const token = res?.data?.token ?? null;

      if (token) {
        localStorage.setItem("token", token);
        set({ token });
      }

      set({ authUser: user });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      const msg = get()._getErrorMessage(error);
      toast.error(msg);
      console.log("Signup error:", error);
    } finally {
      set({ isSigningUp: false });
    }
  },

  // ---- Login ----
  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      // Ensure withCredentials cookies are allowed by server; axiosInstance has withCredentials: true
      const res = await axiosInstance.post("/auth/login", data);

      const user = res?.data?.user ?? res?.data ?? null;
      const token = res?.data?.token ?? null;

      if (token) {
        localStorage.setItem("token", token);
        set({ token });
      }

      set({ authUser: user });
      toast.success("Logged in successfully");
      get().connectSocket();
      return { success: true, user };
    } catch (error) {
      const msg = get()._getErrorMessage(error);
      toast.error(msg);
      console.log("Login error:", error);
      return { success: false, message: msg };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // ---- Logout ----
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (error) {
      console.log("Logout error (server):", error);
      // still proceed to clear client state
    } finally {
      // Clear client-side token + user and disconnect socket
      localStorage.removeItem("token");
      set({ authUser: null, token: null });
      get().disconnectSocket();
      toast.success("Logged out successfully");
    }
  },

  // ---- Update profile ----
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      // server returns updated user
      const updatedUser = res?.data ?? res?.data?.user ?? null;
      if (updatedUser) {
        set({ authUser: updatedUser });
        toast.success("Profile updated successfully");
      }
      return updatedUser;
    } catch (error) {
      const msg = get()._getErrorMessage(error);
      console.log("Update profile error:", error);
      toast.error(msg);
      return null;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  // ---- Socket connection using token in auth (secure) ----
  connectSocket: () => {
    const { authUser, socket, token } = get();
    if (!authUser) return;
    if (socket?.connected) return;

    // Use socket auth (recommended) instead of query string
    const s = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
      auth: {
        token: token || localStorage.getItem("token") || "",
      },
    });

    s.on("connect", () => {
      console.log("Socket connected:", s.id);
    });

    s.on("connect_error", (err) => {
      console.log("Socket connect_error:", err.message);
    });

    s.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    s.connect();
    set({ socket: s });
  },

  disconnectSocket: () => {
    const s = get().socket;
    if (s) {
      try {
        s.disconnect();
      } catch (e) {
        console.log("Socket disconnect error:", e);
      }
      set({ socket: null, onlineUsers: [] });
    }
  },
}));
