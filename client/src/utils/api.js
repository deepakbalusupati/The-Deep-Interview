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
  timeout: 15000, // Reduced to 15 seconds timeout
  withCredentials: false, // Changed to false for development
});

// Add a request interceptor to add authentication token if available
api.interceptors.request.use(
  (config) => {
    // Check if we have a user in localStorage
    const user = localStorage.getItem("user");

    if (user) {
      try {
        const userData = JSON.parse(user);
        // You could add authorization headers here if needed
        // config.headers.Authorization = `Bearer ${userData.token}`;
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        localStorage.removeItem("user");
      }
    }

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
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
      } else if (error.response.status === 503) {
        // Service Unavailable - likely database connection issue
        console.error("Service unavailable:", error.response.data);
      } else if (error.response.status >= 500) {
        // Server error
        console.error(
          "Server error:",
          error.response.status,
          error.response.data
        );
      }
    } else if (error.code === "ECONNABORTED") {
      // Request timeout
      console.error(
        "Request timed out. Please check your connection and try again."
      );
    } else if (error.request) {
      // The request was made but no response was received
      console.error(
        "No response received. Server may be down or network issue:",
        error.request
      );
    } else {
      // Something happened in setting up the request
      console.error("Error setting up request:", error.message);
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors in components
api.handleError = (error, setErrorFn) => {
  if (error.response) {
    // Server responded with error
    setErrorFn(
      error.response.data.message || "An error occurred. Please try again."
    );
  } else if (error.code === "ECONNABORTED") {
    setErrorFn(
      "Request timed out. Please check your connection and try again."
    );
  } else if (error.request) {
    setErrorFn(
      "No response from server. Please check your connection and try again."
    );
  } else {
    setErrorFn("An unexpected error occurred. Please try again later.");
  }
};

export default api;
