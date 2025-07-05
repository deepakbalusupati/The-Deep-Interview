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
let connectionAttempts = 0;
let isConnecting = false;

// Socket connection configuration
const socketConfig = {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 20000,
  autoConnect: false,
  withCredentials: false,
  forceNew: false,
};

// Initialize socket connection
export const initializeSocket = () => {
  if (socket && socket.connected) {
    console.log("Socket already connected:", socket.id);
    return socket;
  }

  if (isConnecting) {
    console.log("Socket connection already in progress");
    return socket;
  }

  try {
    isConnecting = true;
    const serverUrl = getServerUrl();
    console.log("Initializing socket with server URL:", serverUrl);

    // Close existing socket if any
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    socket = io(serverUrl, socketConfig);

    // Connection successful
    socket.on("connect", () => {
      console.log("Socket connected successfully:", socket.id);
      connectionAttempts = 0;
      isConnecting = false;
    });

    // Connection error handling
    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      connectionAttempts++;

      if (connectionAttempts >= 3) {
        console.warn(
          "Multiple connection failures. Check server availability."
        );
      }
    });

    // Disconnection handling
    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      isConnecting = false;

      if (reason === "io server disconnect") {
        // Server initiated disconnect, try to reconnect
        console.log("Server disconnected socket, attempting to reconnect...");
        socket.connect();
      }
    });

    // Reconnection attempt
    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Socket reconnection attempt ${attemptNumber}`);
    });

    // Successful reconnection
    socket.on("reconnect", (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      connectionAttempts = 0;
    });

    // Failed to reconnect
    socket.on("reconnect_failed", () => {
      console.error("Socket failed to reconnect after maximum attempts");
      isConnecting = false;
    });

    // Interview-specific event handlers
    socket.on("joined_interview", (data) => {
      console.log("Successfully joined interview session:", data.sessionId);
    });

    socket.on("receive_question", (data) => {
      console.log("Received question:", data);
    });

    socket.on("receive_response", (data) => {
      console.log("Received response:", data);
    });

    // Error handling
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    // Connect manually
    socket.connect();
  } catch (error) {
    console.error("Error initializing socket:", error);
    isConnecting = false;
  }

  return socket;
};

// Get existing socket instance
export const getSocket = () => {
  if (!socket) {
    console.log("No socket instance, initializing new one");
    return initializeSocket();
  }

  if (!socket.connected) {
    console.log("Socket not connected, attempting to connect");
    socket.connect();
  }

  return socket;
};

// Join interview session
export const joinInterviewSession = (sessionId) => {
  const currentSocket = getSocket();

  if (currentSocket && sessionId) {
    console.log("Joining interview session:", sessionId);
    currentSocket.emit("join_interview", sessionId);
    return true;
  }

  console.warn("Cannot join interview session: no socket or session ID");
  return false;
};

// Send question to interview session
export const sendQuestion = (sessionId, questionData) => {
  const currentSocket = getSocket();

  if (currentSocket && currentSocket.connected && sessionId && questionData) {
    currentSocket.emit("send_question", { sessionId, ...questionData });
    return true;
  }

  console.warn("Cannot send question: socket not ready or missing data");
  return false;
};

// Send response to interview session
export const sendResponse = (sessionId, responseData) => {
  const currentSocket = getSocket();

  if (currentSocket && currentSocket.connected && sessionId && responseData) {
    currentSocket.emit("send_response", { sessionId, ...responseData });
    return true;
  }

  console.warn("Cannot send response: socket not ready or missing data");
  return false;
};

// Check socket connection status
export const isSocketConnected = () => {
  return socket && socket.connected;
};

// Close socket connection
export const closeSocket = () => {
  if (socket) {
    console.log("Closing socket connection");
    socket.disconnect();
    socket = null;
    isConnecting = false;
    connectionAttempts = 0;
  }
};

// Reconnect socket
export const reconnectSocket = () => {
  console.log("Manual socket reconnection requested");

  if (socket) {
    socket.connect();
  } else {
    initializeSocket();
  }
};

// Get connection info
export const getConnectionInfo = () => {
  return {
    connected: socket?.connected || false,
    id: socket?.id || null,
    serverUrl: getServerUrl(),
    connectionAttempts,
    isConnecting,
  };
};

// Create a named object before exporting as default
const socketClient = {
  initializeSocket,
  getSocket,
  joinInterviewSession,
  sendQuestion,
  sendResponse,
  isSocketConnected,
  closeSocket,
  reconnectSocket,
  getConnectionInfo,
};

export default socketClient;
