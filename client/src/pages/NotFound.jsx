import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center animate-fade-in">
        <h1 className="text-9xl font-bold text-primary-600 animate-pulse-slow">404</h1>
        <h2 className="text-3xl font-bold text-secondary-800 mt-4 animate-slide-down">Page Not Found</h2>
        <p className="text-gray-600 mt-2 mb-8 animate-slide-up">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="btn btn-primary py-3 px-6 inline-block transform transition-all duration-300 hover:scale-105"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound; 