import React from "react";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="bg-secondary-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About section */}
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold mb-4 text-primary-300">
              The Deep Interview
            </h3>
            <p className="text-gray-300 mb-4">
              An AI-powered interview simulator designed to help you prepare for
              job interviews with personalized feedback and practice sessions.
            </p>
          </div>

          {/* Quick links */}
          <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
            <h3 className="text-lg font-semibold mb-4 text-primary-300">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/interview/setup"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Start Interview
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/resume"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Resume Manager
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact info */}
          <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
            <h3 className="text-lg font-semibold mb-4 text-primary-300">
              Contact
            </h3>
            <ul className="space-y-2 text-gray-300">
              <li className="hover:text-white transition-colors duration-200">
                Email: support@deepinterview.com
              </li>
              <li className="hover:text-white transition-colors duration-200">
                Phone: +1 (123) 456-7890
              </li>
              <li className="hover:text-white transition-colors duration-200">
                Address: 123 AI Street, Tech City
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div
          className="border-t border-gray-700 mt-8 pt-6 text-sm text-gray-400 text-center animate-fade-in"
          style={{ animationDelay: "300ms" }}
        >
          <p>
            © {new Date().getFullYear()} The Deep Interview. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
