import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import api from "../utils/api";
import { v4 as uuidv4 } from "uuid";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user is logged in from localStorage
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);

          // Validate stored user data
          if (userData && userData.token && userData._id) {
            // Verify token is still valid by making a test request
            try {
              const response = await api.getWithCache(
                `/api/user/profile?userId=${userData._id}`
              );
              if (response.data.success) {
                setCurrentUser(userData);
              } else {
                // Token is invalid, clear stored data
                console.warn("Stored token is invalid, clearing user data");
                api.clearUserData();
              }
            } catch (error) {
              // Token verification failed, clear stored data
              console.warn(
                "Token verification failed, clearing user data:",
                error.message
              );
              api.clearUserData();
            }
          } else {
            // Invalid user data structure, clear it
            console.warn("Invalid user data structure, clearing storage");
            api.clearUserData();
          }
        }

        // Check if debug mode is enabled
        const isDebugMode = localStorage.getItem("debugMode") === "true";
        setDebugMode(isDebugMode);

        // Check server availability
        await checkServerHealth();
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Check if the server is available (memoized to prevent unnecessary calls)
  const checkServerHealth = useCallback(async () => {
    try {
      const response = await api.getWithCache("/api/health", { timeout: 5000 });
      const isAvailable = response.data.status === "ok";
      setServerAvailable(isAvailable);
      return isAvailable;
    } catch (error) {
      console.error("Server health check failed:", error);
      setServerAvailable(false);
      return false;
    }
  }, []);

  // Toggle debug mode
  const toggleDebugMode = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    localStorage.setItem("debugMode", newDebugMode.toString());
    return newDebugMode;
  };

  // Register a new user
  const register = async (name, email, password) => {
    try {
      // Check server availability first
      const isServerAvailable = await checkServerHealth();

      if (isServerAvailable) {
        try {
          const response = await api.post("/api/user/register", {
            name: name.trim(),
            email: email.trim(),
            password,
          });

          if (response.data.success) {
            const { user, token } = response.data;
            const userWithToken = { ...user, token };

            setCurrentUser(userWithToken);
            localStorage.setItem("user", JSON.stringify(userWithToken));

            return {
              success: true,
              user: userWithToken,
              message: response.data.message || "Registration successful",
            };
          } else {
            return {
              success: false,
              message: response.data.message || "Registration failed",
              errors: response.data.errors,
            };
          }
        } catch (error) {
          console.error("Registration error:", error);

          let errorMessage = "Registration failed";
          let errors = {};

          if (error.response?.data) {
            errorMessage = error.response.data.message || errorMessage;
            errors = error.response.data.errors || {};
          } else {
            errorMessage = api.handleError(error);
          }

          return {
            success: false,
            message: errorMessage,
            errors,
          };
        }
      } else {
        // Create a mock user in offline mode
        const mockUser = {
          _id: uuidv4(),
          name: name.trim(),
          email: email.trim(),
          role: "user",
          professionalDetails: {
            currentPosition: "",
            yearsOfExperience: 0,
            industry: "",
            skills: [],
          },
          preferences: {
            defaultInterviewType: "mixed",
            defaultSkillLevel: "intermediate",
            notificationsEnabled: true,
          },
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          isOfflineUser: true,
          token: `offline-token-${uuidv4()}`, // Generate a fake token for offline mode
        };

        setCurrentUser(mockUser);
        localStorage.setItem("user", JSON.stringify(mockUser));

        return {
          success: true,
          user: mockUser,
          message:
            "Created offline account. Some features may be limited until you connect to the server.",
        };
      }
    } catch (error) {
      console.error("Unexpected registration error:", error);
      return {
        success: false,
        message: "An unexpected error occurred during registration",
      };
    }
  };

  // Login a user
  const login = async (email, password) => {
    try {
      // Check server availability first
      const isServerAvailable = await checkServerHealth();

      if (isServerAvailable) {
        try {
          const response = await api.post("/api/user/login", {
            email: email.trim(),
            password,
          });

          if (response.data.success) {
            const { user, token } = response.data;
            const userWithToken = { ...user, token };

            setCurrentUser(userWithToken);
            localStorage.setItem("user", JSON.stringify(userWithToken));

            return {
              success: true,
              user: userWithToken,
              message: response.data.message || "Login successful",
            };
          } else {
            return {
              success: false,
              message: response.data.message || "Login failed",
              errors: response.data.errors,
            };
          }
        } catch (error) {
          console.error("Login error:", error);

          let errorMessage = "Login failed";
          let errors = {};

          if (error.response?.data) {
            errorMessage = error.response.data.message || errorMessage;
            errors = error.response.data.errors || {};
          } else {
            errorMessage = api.handleError(error);
          }

          return {
            success: false,
            message: errorMessage,
            errors,
          };
        }
      } else {
        // In offline mode, try to find a stored user with matching email
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData.email === email.trim() && userData.isOfflineUser) {
              setCurrentUser(userData);
              return {
                success: true,
                user: userData,
                message:
                  "Logged in offline mode. Some features may be limited.",
              };
            }
          } catch (error) {
            console.error("Error parsing stored user data:", error);
          }
        }

        return {
          success: false,
          message: "Server unavailable. Cannot authenticate user.",
        };
      }
    } catch (error) {
      console.error("Unexpected login error:", error);
      return {
        success: false,
        message: "An unexpected error occurred during login",
      };
    }
  };

  // Logout user
  const logout = () => {
    try {
      setCurrentUser(null);
      api.clearUserData();

      // Clear any interview session data
      localStorage.removeItem("lastInterviewSession");

      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, message: "Error during logout" };
    }
  };

  // Update current user data
  const updateUser = (userData) => {
    try {
      const updatedUser = { ...currentUser, ...userData };
      setCurrentUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error("Error updating user:", error);
      return { success: false, message: "Failed to update user data" };
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return currentUser && currentUser._id && currentUser.token;
  };

  // Get user token
  const getToken = () => {
    return currentUser?.token || null;
  };

  // Refresh user data from server (memoized to prevent unnecessary calls)
  const refreshUser = useCallback(async () => {
    if (!currentUser?._id)
      return { success: false, message: "No user logged in" };

    try {
      // Clear cache before refreshing to get fresh data
      api.clearUserCache();
      const response = await api.getWithCache(
        `/api/user/profile?userId=${currentUser._id}`
      );
      if (response.data.success) {
        const updatedUser = { ...response.data.user, token: currentUser.token };
        setCurrentUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return { success: true, user: updatedUser };
      }
      return { success: false, message: "Failed to refresh user data" };
    } catch (error) {
      console.error("Error refreshing user:", error);
      return { success: false, message: api.handleError(error) };
    }
  }, [currentUser?._id, currentUser?.token]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      currentUser,
      loading,
      serverAvailable,
      debugMode,
      register,
      login,
      logout,
      updateUser,
      isAuthenticated,
      getToken,
      refreshUser,
      checkServerHealth,
      toggleDebugMode,
    }),
    [
      currentUser,
      loading,
      serverAvailable,
      debugMode,
      refreshUser,
      checkServerHealth,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
