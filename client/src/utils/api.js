import axios from "axios";
import performanceMonitor from "./performanceMonitor";

const requestCache = new Map();
const dataCache = new Map();

const CACHE_CONFIG = {
  USER_PROFILE: 5 * 60 * 1000,
  USER_HISTORY: 2 * 60 * 1000,
  USER_STATISTICS: 2 * 60 * 1000,
  RESUMES: 5 * 60 * 1000,
  POSITIONS: 10 * 60 * 1000,
  HEALTH: 30 * 1000,
  DEFAULT: 1 * 60 * 1000,
};

const generateCacheKey = (method, url, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  return `${method.toUpperCase()}:${url}:${JSON.stringify(sortedParams)}`;
};

const getCacheDuration = (url) => {
  if (url.includes("/user/profile")) return CACHE_CONFIG.USER_PROFILE;
  if (url.includes("/user/history")) return CACHE_CONFIG.USER_HISTORY;
  if (url.includes("/user/statistics")) return CACHE_CONFIG.USER_STATISTICS;
  if (url.includes("/resume")) return CACHE_CONFIG.RESUMES;
  if (url.includes("/interview/positions")) return CACHE_CONFIG.POSITIONS;
  if (url.includes("/health")) return CACHE_CONFIG.HEALTH;
  return CACHE_CONFIG.DEFAULT;
};

const deduplicateRequest = (key, requestFn, cacheDuration = 0) => {
  if (requestCache.has(key)) {
    if (process.env.NODE_ENV === "development") {
      console.log(`🔄 Deduplicating request: ${key}`);
    }
    return requestCache.get(key);
  }

  if (cacheDuration > 0) {
    const cachedData = dataCache.get(key);
    if (cachedData && Date.now() - cachedData.timestamp < cacheDuration) {
      if (process.env.NODE_ENV === "development") {
        console.log(`📦 Using cached data: ${key}`);
      }
      return Promise.resolve(cachedData.data);
    }
  }

  const promise = requestFn()
    .then((response) => {
      if (cacheDuration > 0) {
        dataCache.set(key, {
          data: response,
          timestamp: Date.now(),
        });
      }
      return response;
    })
    .finally(() => {
      setTimeout(() => {
        requestCache.delete(key);
      }, 100);
    });

  requestCache.set(key, promise);
  return promise;
};

const clearCache = (pattern = null) => {
  if (pattern) {
    for (const [key] of dataCache.entries()) {
      if (key.includes(pattern)) {
        dataCache.delete(key);
      }
    }
  } else {
    dataCache.clear();
  }
  requestCache.clear();
};

const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (process.env.NODE_ENV === "development") return "http://localhost:5001";
  return window.location.origin;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // Increased timeout for better reliability
  withCredentials: false,
});

api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.token) {
          config.headers.Authorization = `Bearer ${userData.token}`;
        }
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        localStorage.removeItem("user");
      }
    }

    config.metadata = {
      startTime: new Date(),
      trackingKey: performanceMonitor.trackApiCall(config.method, config.url),
    };

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (response.config.metadata) {
      const duration = new Date() - response.config.metadata.startTime;
      console.log(
        `API Request: ${response.config.method?.toUpperCase()} ${
          response.config.url
        } - ${response.status} (${duration}ms)`
      );

      if (response.config.metadata.trackingKey) {
        performanceMonitor.completeApiCall(
          response.config.metadata.trackingKey,
          true
        );
      }
    }

    return response;
  },
  (error) => {
    if (error.config?.metadata) {
      const duration = new Date() - error.config.metadata.startTime;
      console.log(
        `API Request Failed: ${error.config.method?.toUpperCase()} ${
          error.config.url
        } - ${error.response?.status || "Network Error"} (${duration}ms)`
      );

      if (error.config.metadata.trackingKey) {
        performanceMonitor.completeApiCall(
          error.config.metadata.trackingKey,
          false,
          error
        );
      }
    }

    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          if (
            data?.error === "TOKEN_EXPIRED" ||
            data?.error === "INVALID_TOKEN"
          ) {
            console.warn("Token expired or invalid, clearing user data");
            localStorage.removeItem("user");

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
          console.error(
            "Access forbidden:",
            data?.message || "You don't have permission to access this resource"
          );
          break;

        case 404:
          console.warn(
            "Resource not found:",
            data?.message || "The requested resource was not found"
          );
          break;

        case 409:
          console.warn("Conflict:", data?.message || "Resource conflict");
          break;

        case 422:
          console.warn(
            "Validation error:",
            data?.message || "Invalid data provided"
          );
          break;

        case 429:
          console.warn(
            "Rate limit exceeded:",
            data?.message || "Too many requests"
          );
          break;

        case 500:
        case 502:
        case 503:
        case 504:
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
      console.error(
        "Request timed out. Please check your connection and try again."
      );
    } else if (error.request) {
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
api.handleError = (error, setErrorFn = null) => {
  let errorMessage = "An unexpected error occurred. Please try again.";

  if (error?.response) {
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
  } else if (error?.code === "ECONNABORTED") {
    errorMessage =
      "Request timed out. Please check your connection and try again.";
  } else if (error?.request) {
    errorMessage =
      "Unable to connect to server. Please check your internet connection.";
  } else if (error?.message) {
    errorMessage = error.message;
  }

  if (setErrorFn && typeof setErrorFn === "function") {
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

// Enhanced API methods with deduplication and caching
api.getWithCache = (url, config = {}) => {
  const cacheKey = generateCacheKey("GET", url, config.params);
  const cacheDuration = getCacheDuration(url);

  return deduplicateRequest(
    cacheKey,
    () => api.get(url, config),
    cacheDuration
  );
};

api.postWithDedup = (url, data, config = {}) => {
  const cacheKey = generateCacheKey("POST", url, { data, ...config.params });

  return deduplicateRequest(
    cacheKey,
    () => api.post(url, data, config),
    0 // No caching for POST requests
  );
};

api.putWithDedup = (url, data, config = {}) => {
  const cacheKey = generateCacheKey("PUT", url, { data, ...config.params });

  return deduplicateRequest(
    cacheKey,
    () => api.put(url, data, config),
    0 // No caching for PUT requests
  );
};

api.deleteWithDedup = (url, config = {}) => {
  const cacheKey = generateCacheKey("DELETE", url, config.params);

  return deduplicateRequest(
    cacheKey,
    () => api.delete(url, config),
    0 // No caching for DELETE requests
  );
};

// Cache management functions
api.clearCache = clearCache;
api.clearUserCache = () => clearCache("user");
api.clearResumeCache = () => clearCache("resume");

// Function to invalidate cache when user data changes
api.invalidateUserCache = () => {
  clearCache("/user/");
  clearCache("/resume");
};

export default api;
