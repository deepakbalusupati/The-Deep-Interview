import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register, serverAvailable, checkServerHealth } = useAuth();

  useEffect(() => {
    // Check server availability on component mount
    const checkServer = async () => {
      await checkServerHealth();
    };
    
    checkServer();
  }, [checkServerHealth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setError('');
    setSuccessMessage('');
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return setError('Please fill in all fields');
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    try {
      setLoading(true);
      
      const result = await register(name, email, password);
      
      if (result.success) {
        if (result.message) {
          setSuccessMessage(result.message);
          // Give user time to read the message before redirecting
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to create an account. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg animate-fade-in">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-primary-700 animate-slide-down">Create Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-300"
            >
              log in to your existing account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6 animate-slide-up" onSubmit={handleSubmit}>
          {!serverAvailable && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md p-4 text-sm animate-fade-in">
              Server appears to be unavailable. You can still create an account in offline mode, but some features may be limited.
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 text-sm animate-fade-in">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-600 rounded-md p-4 text-sm animate-fade-in">
              {successMessage}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="group">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="form-input group-hover:border-primary-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="form-input group-hover:border-primary-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="form-input group-hover:border-primary-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters long.
              </p>
            </div>
            
            <div className="group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="form-input group-hover:border-primary-400"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full btn btn-primary py-3 transition-all duration-300 transform hover:scale-102"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
          
          <div className="text-sm text-center text-gray-600">
            By registering, you agree to our{' '}
            <Link to="/terms" className="text-primary-600 hover:text-primary-500 transition-colors duration-300">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-primary-600 hover:text-primary-500 transition-colors duration-300">
              Privacy Policy
            </Link>
            .
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register; 