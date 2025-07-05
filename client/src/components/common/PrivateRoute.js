import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PrivateRoute = ({ children, requireAuth = true }) => {
  const { currentUser, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Check if this is an interview session route
  const isInterviewSessionRoute = location.pathname.includes(
    "/interview/session/"
  );

  // Check if this is a public route that should be accessible without auth
  const isPublicRoute = ["/", "/login", "/register"].includes(
    location.pathname
  );

  // Show loading spinner while auth is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Authenticating...</p>
        </div>
      </div>
    );
  }

  // For routes that require authentication
  if (requireAuth && !isAuthenticated()) {
    // Allow access to interview session routes with offline fallback
    if (isInterviewSessionRoute) {
      console.log(
        "Allowing access to interview session without auth (offline mode)"
      );
      return children;
    }

    // Redirect to login with return path
    const redirectPath = location.pathname + location.search;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirectPath)}`}
        replace
      />
    );
  }

  // For routes that should redirect authenticated users away (like login/register)
  if (!requireAuth && isAuthenticated() && !isPublicRoute) {
    const redirectTo =
      new URLSearchParams(location.search).get("redirect") || "/dashboard";
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default PrivateRoute;
