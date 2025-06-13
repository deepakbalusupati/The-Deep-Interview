import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Menu,
  X,
  ChevronDown,
  User,
  FileText,
  Terminal,
  LogOut,
  Mic,
} from "react-feather";
import logo from "../../assets/images/logo.svg";

// Add a debug mode toggle in the user dropdown menu
const UserDropdown = ({ currentUser, logout, debugMode, toggleDebugMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleDebugToggle = (e) => {
    e.preventDefault();
    const isEnabled = toggleDebugMode();
    alert(`Debug mode ${isEnabled ? "enabled" : "disabled"}`);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 focus:outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
          <User size={18} className="text-primary-600" />
        </div>
        <span className="hidden md:block">{currentUser?.name || "User"}</span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
          <Link
            to="/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            <User size={14} className="inline mr-2" />
            Profile
          </Link>
          <Link
            to="/resume"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            <FileText size={14} className="inline mr-2" />
            Resumes
          </Link>
          <div className="border-t border-gray-100 my-1"></div>
          <button
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleDebugToggle}
          >
            <Terminal size={14} className="inline mr-2" />
            {debugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
          </button>
          <button
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
          >
            <LogOut size={14} className="inline mr-2" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentUser, logout, debugMode, toggleDebugMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50 transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img
              src={logo}
              alt="The Deep Interview Logo"
              className="w-10 h-10"
            />
            <span className="text-xl font-bold text-gray-900">
              The Deep Interview
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className={`nav-link ${isActive("/") ? "text-primary-600" : ""}`}
            >
              Home
            </Link>

            {currentUser ? (
              <>
                <Link
                  to="/dashboard"
                  className={`nav-link ${
                    isActive("/dashboard") ? "text-primary-600" : ""
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/interview/setup"
                  className={`nav-link ${
                    isActive("/interview/setup") ? "text-primary-600" : ""
                  }`}
                >
                  Start Interview
                </Link>
                <Link
                  to="/resume"
                  className={`nav-link ${
                    isActive("/resume") ? "text-primary-600" : ""
                  }`}
                >
                  Resumes
                </Link>

                {/* Profile dropdown */}
                <UserDropdown
                  currentUser={currentUser}
                  logout={logout}
                  debugMode={debugMode}
                  toggleDebugMode={toggleDebugMode}
                />
              </>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Link to="/login" className="btn btn-outline">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Register
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col">
              <Link
                to="/"
                className={`text-gray-700 hover:text-primary-600 py-2 transition-colors duration-200 ${
                  isActive("/") ? "text-primary-600" : ""
                }`}
                onClick={toggleMenu}
              >
                Home
              </Link>

              {currentUser ? (
                <>
                  <Link
                    to="/dashboard"
                    className={`text-gray-700 hover:text-primary-600 py-2 transition-colors duration-200 ${
                      isActive("/dashboard") ? "text-primary-600" : ""
                    }`}
                    onClick={toggleMenu}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/interview/setup"
                    className={`text-gray-700 hover:text-primary-600 py-2 transition-colors duration-200 ${
                      isActive("/interview/setup") ? "text-primary-600" : ""
                    }`}
                    onClick={toggleMenu}
                  >
                    Start Interview
                  </Link>
                  <Link
                    to="/resume"
                    className={`text-gray-700 hover:text-primary-600 py-2 transition-colors duration-200 ${
                      isActive("/resume") ? "text-primary-600" : ""
                    }`}
                    onClick={toggleMenu}
                  >
                    Resumes
                  </Link>
                  <Link
                    to="/profile"
                    className={`text-gray-700 hover:text-primary-600 py-2 transition-colors duration-200 ${
                      isActive("/profile") ? "text-primary-600" : ""
                    }`}
                    onClick={toggleMenu}
                  >
                    Profile
                  </Link>
                  <button
                    className="text-left text-gray-700 hover:text-primary-600 py-2 transition-colors duration-200"
                    onClick={(e) => {
                      e.preventDefault();
                      const isEnabled = toggleDebugMode();
                      alert(`Debug mode ${isEnabled ? "enabled" : "disabled"}`);
                      toggleMenu();
                    }}
                  >
                    {debugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
                  </button>
                  <button
                    className="text-left text-gray-700 hover:text-primary-600 py-2 transition-colors duration-200"
                    onClick={() => {
                      handleLogout();
                      toggleMenu();
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary-600 py-2 transition-colors duration-200"
                    onClick={toggleMenu}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="text-gray-700 hover:text-primary-600 py-2 transition-colors duration-200"
                    onClick={toggleMenu}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
