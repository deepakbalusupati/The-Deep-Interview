import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Check if this is an interview session route
  const isInterviewSessionRoute = location.pathname.includes(
    "/interview/session/"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  // Allow access to interview session routes even for non-authenticated users
  if (!currentUser && !isInterviewSessionRoute) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default PrivateRoute;
