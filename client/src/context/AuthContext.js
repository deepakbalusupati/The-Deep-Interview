import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }

    // Check if debug mode is enabled
    const isDebugMode = localStorage.getItem("debugMode") === "true";
    setDebugMode(isDebugMode);

    setLoading(false);
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
      const response = await axios.post("/api/user/register", {
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
  };

  // Login user
  const login = async (email, password) => {
    try {
      const response = await axios.post("/api/user/login", {
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
    try {
      const response = await axios.patch(
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
  };

  // Update user preferences
  const updatePreferences = async (userId, preferencesData) => {
    try {
      const response = await axios.patch(
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
  };

  const value = {
    currentUser,
    loading,
    debugMode,
    toggleDebugMode,
    register,
    login,
    logout,
    updateUser,
    updateProfile,
    updatePreferences,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
