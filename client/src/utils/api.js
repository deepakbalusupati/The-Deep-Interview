import axios from "axios";

// Determine the API base URL with fallback options
const getBaseUrl = () => {
  // Use environment variable if available
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // In development, use the full URL to avoid proxy issues
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:5001";
  }

  // In production, use the same origin
  return window.location.origin;
};

// Create an axios instance with a base URL
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds timeout
  withCredentials: false, // Changed to false for development
});

// Add a request interceptor to add authentication token if available
api.interceptors.request.use(
  (config) => {
    // Check if we have a user in localStorage
    const user = localStorage.getItem("user");

    if (user) {
      // You could add authorization headers here if needed
      // config.headers.Authorization = `Bearer ${JSON.parse(user).token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle specific error statuses
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 401) {
        // Unauthorized - clear localStorage and redirect to login
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something happened in setting up the request
      console.error("Error setting up request:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
