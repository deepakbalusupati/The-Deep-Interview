import axios from "axios";

// Create an axios instance with a base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5001",
  headers: {
    "Content-Type": "application/json",
  },
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
    }

    return Promise.reject(error);
  }
);

export default api;
