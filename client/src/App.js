import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard";
import InterviewSetup from "./pages/InterviewSetup";
import InterviewSession from "./pages/InterviewSession";
import InterviewResults from "./pages/InterviewResults";
import Profile from "./pages/Profile";
import ResumeManager from "./pages/ResumeManager";
import PrivateRoute from "./components/common/PrivateRoute";
import NotFound from "./pages/NotFound";
import LogoSpinner from "./components/common/LogoSpinner";

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary-900">
        <div className="text-center">
          <LogoSpinner size="large" />
          <h1 className="text-4xl font-bold text-primary-400 mt-4">
            The Deep Interview
          </h1>
          <div className="rounded-full h-2 w-32 bg-gray-700 mx-auto mt-6 overflow-hidden">
            <div className="h-full bg-primary-500 w-2/3 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-grow animate-fade-in">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            <Route
              path="/interview/setup"
              element={
                <PrivateRoute>
                  <InterviewSetup />
                </PrivateRoute>
              }
            />

            <Route
              path="/interview/session/:sessionId"
              element={
                <PrivateRoute>
                  <InterviewSession />
                </PrivateRoute>
              }
            />

            <Route
              path="/interview/results/:sessionId"
              element={
                <PrivateRoute>
                  <InterviewResults />
                </PrivateRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />

            <Route
              path="/resume"
              element={
                <PrivateRoute>
                  <ResumeManager />
                </PrivateRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
