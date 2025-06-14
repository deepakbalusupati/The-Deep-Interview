import { io } from "socket.io-client";

// Default server URL with fallback options
const getServerUrl = () => {
  // Use environment variable if available
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // In development, use the full URL
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:5001";
  }

  // In production, use the same origin
  return window.location.origin;
};

// Create a singleton socket instance
let socket = null;

export const initializeSocket = () => {
  if (!socket) {
    const serverUrl = getServerUrl();
    console.log("Initializing socket with server URL:", serverUrl);

    socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      withCredentials: false, // Changed to false for development
    });

    socket.on("connect", () => {
      console.log("Socket connected successfully:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });
  }

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("Socket connection closed");
  }
};

// Create a named object before exporting as default
const socketClient = {
  initializeSocket,
  getSocket,
  closeSocket,
};

export default socketClient;
