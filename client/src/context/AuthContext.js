import React, { createContext, useState, useEffect, useContext } from "react";
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
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }

    // Check if debug mode is enabled
    const isDebugMode = localStorage.getItem("debugMode") === "true";
    setDebugMode(isDebugMode);

    // Check server availability
    checkServerHealth();

    setLoading(false);
  }, []);

  // Check if the server is available
  const checkServerHealth = async () => {
    try {
      const response = await api.get("/api/health", { timeout: 3000 });
      setServerAvailable(response.data.status === "ok");
      return response.data.status === "ok";
    } catch (error) {
      console.error("Server health check failed:", error);
      setServerAvailable(false);
      return false;
    }
  };

  // Toggle debug mode
  const toggleDebugMode = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    localStorage.setItem("debugMode", newDebugMode.toString());
    return newDebugMode;
  };

  // Register a new user
  const register = async (name, email, password) => {
    // Check server availability first
    const isServerAvailable = await checkServerHealth();

    if (isServerAvailable) {
      try {
        const response = await api.post("/api/user/register", {
          name,
          email,
          password,
        });

        const user = response.data.user;
        setCurrentUser(user);
        localStorage.setItem("user", JSON.stringify(user));
        return { success: true, user };
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.message || "Registration failed",
        };
      }
    } else {
      // Create a mock user in offline mode
      const mockUser = {
        _id: uuidv4(),
        name,
        email,
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
  };

  // Login user
  const login = async (email, password) => {
    // Check server availability first
    const isServerAvailable = await checkServerHealth();

    if (isServerAvailable) {
      try {
        const response = await api.post("/api/user/login", {
          email,
          password,
        });

        const user = response.data.user;
        setCurrentUser(user);
        localStorage.setItem("user", JSON.stringify(user));
        return { success: true, user };
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.message || "Login failed",
        };
      }
    } else {
      // Try to find user in localStorage for offline login
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.email === email) {
            // In a real app, we would verify the password hash
            // But for offline mode, we'll just check if it's the same user
            setCurrentUser(user);
            return {
              success: true,
              user,
              message: "Logged in offline mode. Some features may be limited.",
            };
          }
        }
      } catch (err) {
        console.error("Error checking local user:", err);
      }

      return {
        success: false,
        message: "Server is unavailable and no matching local account found.",
      };
    }
  };

  // Logout user
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("user");
  };

  // Update user information
  const updateUser = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // Update user profile
  const updateProfile = async (userId, profileData) => {
    // Check server availability first
    const isServerAvailable = await checkServerHealth();

    if (isServerAvailable) {
      try {
        const response = await api.patch(
          `/api/user/profile?userId=${userId}`,
          profileData
        );

        const updatedUser = response.data.user;
        setCurrentUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return { success: true, user: updatedUser };
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.message || "Profile update failed",
        };
      }
    } else {
      // Update profile locally in offline mode
      try {
        const currentUserData = { ...currentUser };

        // Update basic fields
        if (profileData.name) currentUserData.name = profileData.name;

        // Update professional details
        if (profileData.currentPosition)
          currentUserData.professionalDetails.currentPosition =
            profileData.currentPosition;
        if (profileData.yearsOfExperience)
          currentUserData.professionalDetails.yearsOfExperience =
            profileData.yearsOfExperience;
        if (profileData.industry)
          currentUserData.professionalDetails.industry = profileData.industry;
        if (profileData.skills)
          currentUserData.professionalDetails.skills = profileData.skills;

        currentUserData.lastActive = new Date().toISOString();

        setCurrentUser(currentUserData);
        localStorage.setItem("user", JSON.stringify(currentUserData));

        return {
          success: true,
          user: currentUserData,
          message:
            "Profile updated in offline mode. Changes will sync when connected.",
        };
      } catch (error) {
        return {
          success: false,
          message: "Failed to update profile in offline mode",
        };
      }
    }
  };

  // Update user preferences
  const updatePreferences = async (userId, preferencesData) => {
    // Check server availability first
    const isServerAvailable = await checkServerHealth();

    if (isServerAvailable) {
      try {
        const response = await api.patch(
          `/api/user/preferences?userId=${userId}`,
          preferencesData
        );

        const updatedUser = response.data.user;
        setCurrentUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return { success: true, user: updatedUser };
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.message || "Preferences update failed",
        };
      }
    } else {
      // Update preferences locally in offline mode
      try {
        const currentUserData = { ...currentUser };

        // Update preferences
        if (preferencesData.defaultInterviewType)
          currentUserData.preferences.defaultInterviewType =
            preferencesData.defaultInterviewType;
        if (preferencesData.defaultSkillLevel)
          currentUserData.preferences.defaultSkillLevel =
            preferencesData.defaultSkillLevel;
        if (preferencesData.notificationsEnabled !== undefined)
          currentUserData.preferences.notificationsEnabled =
            preferencesData.notificationsEnabled;

        currentUserData.lastActive = new Date().toISOString();

        setCurrentUser(currentUserData);
        localStorage.setItem("user", JSON.stringify(currentUserData));

        return {
          success: true,
          user: currentUserData,
          message:
            "Preferences updated in offline mode. Changes will sync when connected.",
        };
      } catch (error) {
        return {
          success: false,
          message: "Failed to update preferences in offline mode",
        };
      }
    }
  };

  const value = {
    currentUser,
    loading,
    debugMode,
    serverAvailable,
    toggleDebugMode,
    register,
    login,
    logout,
    updateUser,
    updateProfile,
    updatePreferences,
    checkServerHealth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
