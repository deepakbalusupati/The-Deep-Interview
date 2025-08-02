import { io } from "socket.io-client";

const getServerUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (process.env.NODE_ENV === "development") return "http://localhost:5001";
  return window.location.origin;
};

let socket = null;
let connectionAttempts = 0;
let isConnecting = false;

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

export const initializeSocket = () => {
  if (socket && socket.connected) return socket;
  if (isConnecting) return socket;

  try {
    isConnecting = true;
    const serverUrl = getServerUrl();

    if (socket) {
      socket.disconnect();
      socket = null;
    }

    socket = io(serverUrl, socketConfig);

    socket.on("connect", () => {
      connectionAttempts = 0;
      isConnecting = false;
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      connectionAttempts++;
      if (connectionAttempts >= 3) {
        console.warn(
          "Multiple connection failures. Check server availability."
        );
      }
    });

    socket.on("disconnect", (reason) => {
      isConnecting = false;
      if (reason === "io server disconnect") {
        socket.connect();
      }
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      connectionAttempts = attemptNumber;
    });

    socket.on("reconnect", () => {
      connectionAttempts = 0;
    });

    socket.on("reconnect_failed", () => {
      console.error("Socket failed to reconnect after maximum attempts");
      isConnecting = false;
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    socket.connect();
  } catch (error) {
    console.error("Error initializing socket:", error);
    isConnecting = false;
  }

  return socket;
};

export const getSocket = () => {
  if (!socket) return initializeSocket();
  if (!socket.connected) socket.connect();
  return socket;
};

export const joinInterviewSession = (sessionId) => {
  const currentSocket = getSocket();
  if (currentSocket && sessionId) {
    currentSocket.emit("join_interview", sessionId);
    return true;
  }
  console.warn("Cannot join interview session: no socket or session ID");
  return false;
};

export const sendQuestion = (sessionId, questionData) => {
  const currentSocket = getSocket();
  if (currentSocket && currentSocket.connected && sessionId && questionData) {
    currentSocket.emit("send_question", { sessionId, ...questionData });
    return true;
  }
  console.warn("Cannot send question: socket not ready or missing data");
  return false;
};

export const sendResponse = (sessionId, responseData) => {
  const currentSocket = getSocket();
  if (currentSocket && currentSocket.connected && sessionId && responseData) {
    currentSocket.emit("send_response", { sessionId, ...responseData });
    return true;
  }
  console.warn("Cannot send response: socket not ready or missing data");
  return false;
};

export const isSocketConnected = () => socket && socket.connected;

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnecting = false;
    connectionAttempts = 0;
  }
};

export const reconnectSocket = () => {
  if (socket) {
    socket.connect();
  } else {
    initializeSocket();
  }
};

export const getConnectionInfo = () => ({
  connected: socket?.connected || false,
  id: socket?.id || null,
  serverUrl: getServerUrl(),
  connectionAttempts,
  isConnecting,
});

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
