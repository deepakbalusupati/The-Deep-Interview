import axios from "axios";

// Function to get the base URL based on environment
const getBaseUrl = () => {
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

// Create an axios instance with a base URL
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // Increased timeout for better reliability
  withCredentials: false,
});

// Add a request interceptor to add authentication token if available
api.interceptors.request.use(
  (config) => {
    // Check if we have a user with token in localStorage
    const user = localStorage.getItem("user");

    if (user) {
      try {
        const userData = JSON.parse(user);
        // Add JWT token to authorization header if available
        if (userData.token) {
          config.headers.Authorization = `Bearer ${userData.token}`;
        }
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        localStorage.removeItem("user");
      }
    }

    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors and logging
api.interceptors.response.use(
  (response) => {
    // Calculate request duration for debugging
    if (response.config.metadata) {
      const duration = new Date() - response.config.metadata.startTime;
      console.log(
        `API Request: ${response.config.method?.toUpperCase()} ${
          response.config.url
        } - ${response.status} (${duration}ms)`
      );
    }

    return response;
  },
  (error) => {
    // Calculate request duration for debugging
    if (error.config?.metadata) {
      const duration = new Date() - error.config.metadata.startTime;
      console.log(
        `API Request Failed: ${error.config.method?.toUpperCase()} ${
          error.config.url
        } - ${error.response?.status || "Network Error"} (${duration}ms)`
      );
    }

    // Handle specific error statuses
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - handle token issues
          if (
            data?.error === "TOKEN_EXPIRED" ||
            data?.error === "INVALID_TOKEN"
          ) {
            console.warn("Token expired or invalid, clearing user data");
            localStorage.removeItem("user");

            // Only redirect to login if not already on login/register pages
            const currentPath = window.location.pathname;
            if (
              !currentPath.includes("/login") &&
              !currentPath.includes("/register") &&
              !currentPath.includes("/")
            ) {
              window.location.href = "/login";
            }
          }
          break;

        case 403:
          // Forbidden
          console.error(
            "Access forbidden:",
            data?.message || "You don't have permission to access this resource"
          );
          break;

        case 404:
          // Not found
          console.warn(
            "Resource not found:",
            data?.message || "The requested resource was not found"
          );
          break;

        case 409:
          // Conflict (e.g., user already exists)
          console.warn("Conflict:", data?.message || "Resource conflict");
          break;

        case 422:
          // Validation error
          console.warn(
            "Validation error:",
            data?.message || "Invalid data provided"
          );
          break;

        case 429:
          // Rate limiting
          console.warn(
            "Rate limit exceeded:",
            data?.message || "Too many requests"
          );
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          console.error(
            "Server error:",
            status,
            data?.message || "Internal server error"
          );
          break;

        default:
          console.error("API error:", status, data?.message || "Unknown error");
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
        error.message
      );
    } else {
      // Something happened in setting up the request
      console.error("Error setting up request:", error.message);
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors in components with improved error messages
api.handleError = (error, setErrorFn) => {
  let errorMessage = "An unexpected error occurred. Please try again.";

  if (error.response) {
    const { status, data } = error.response;

    // Use server-provided error message if available
    if (data?.message) {
      errorMessage = data.message;
    } else {
      // Fallback messages based on status code
      switch (status) {
        case 400:
          errorMessage =
            "Invalid request. Please check your input and try again.";
          break;
        case 401:
          errorMessage =
            "Authentication required. Please log in and try again.";
          break;
        case 403:
          errorMessage = "You don't have permission to perform this action.";
          break;
        case 404:
          errorMessage = "The requested resource was not found.";
          break;
        case 409:
          errorMessage = "This action conflicts with existing data.";
          break;
        case 422:
          errorMessage = "Please check your input and try again.";
          break;
        case 429:
          errorMessage =
            "Too many requests. Please wait a moment and try again.";
          break;
        case 500:
          errorMessage = "Server error. Please try again later.";
          break;
        case 503:
          errorMessage =
            "Service temporarily unavailable. Please try again later.";
          break;
        default:
          errorMessage = `Error ${status}: ${
            data?.message || "Unknown error occurred"
          }`;
      }
    }
  } else if (error.code === "ECONNABORTED") {
    errorMessage =
      "Request timed out. Please check your connection and try again.";
  } else if (error.request) {
    errorMessage =
      "Unable to connect to server. Please check your internet connection.";
  }

  if (setErrorFn) {
    setErrorFn(errorMessage);
  }

  return errorMessage;
};

// Helper function to check if user is authenticated
api.isAuthenticated = () => {
  try {
    const user = localStorage.getItem("user");
    if (!user) return false;

    const userData = JSON.parse(user);
    return !!(userData && userData.token && userData._id);
  } catch (error) {
    console.error("Error checking authentication:", error);
    localStorage.removeItem("user");
    return false;
  }
};

// Helper function to get current user
api.getCurrentUser = () => {
  try {
    const user = localStorage.getItem("user");
    if (!user) return null;

    return JSON.parse(user);
  } catch (error) {
    console.error("Error getting current user:", error);
    localStorage.removeItem("user");
    return null;
  }
};

// Helper function to clear user data
api.clearUserData = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("lastInterviewSession");
  localStorage.removeItem("debugMode");
};

// Helper function to update user data in localStorage
api.updateUserData = (userData) => {
  try {
    const existingUser = api.getCurrentUser();
    const updatedUser = { ...existingUser, ...userData };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    return updatedUser;
  } catch (error) {
    console.error("Error updating user data:", error);
    return null;
  }
};

// Helper function for retry logic
api.withRetry = async (apiCall, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Don't retry on client errors (4xx)
      if (
        error.response &&
        error.response.status >= 400 &&
        error.response.status < 500
      ) {
        throw error;
      }

      console.warn(
        `API call failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
};

export default api;
