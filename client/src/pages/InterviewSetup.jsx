import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Briefcase, ChevronDown, Clock, FileText, Shield } from 'react-feather';

function InterviewSetup() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [jobPosition, setJobPosition] = useState('');
  const [interviewType, setInterviewType] = useState('technical');
  const [skillLevel, setSkillLevel] = useState('intermediate');
  const [resumeId, setResumeId] = useState('');
  const [duration, setDuration] = useState(30);
  
  const [jobPositions, setJobPositions] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSetupData = async () => {
      try {
        setLoading(true);
        
        // Fetch popular job positions
        const positionsResponse = await axios.get('/api/interview/positions');
        setJobPositions(positionsResponse.data.positions);
        
        // Fetch user's resumes
        if (currentUser?._id) {
          const resumesResponse = await axios.get(`/api/resume?userId=${currentUser._id}`);
          setResumes(resumesResponse.data.resumes);
          
          // Set default resume if available
          const defaultResume = resumesResponse.data.resumes.find(r => r.isDefault);
          if (defaultResume) {
            setResumeId(defaultResume._id);
          }
        }
        
        // Set default job position from user's profile if available
        if (currentUser?.professionalDetails?.currentPosition) {
          setJobPosition(currentUser.professionalDetails.currentPosition);
        }
        
        // Set default interview type from user's preferences if available
        if (currentUser?.preferences?.defaultInterviewType) {
          setInterviewType(currentUser.preferences.defaultInterviewType);
        }
        
        // Set default skill level from user's preferences if available
        if (currentUser?.preferences?.defaultSkillLevel) {
          setSkillLevel(currentUser.preferences.defaultSkillLevel);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching setup data:', err);
        setError('Failed to load setup data. Please try again.');
        setLoading(false);
      }
    };

    fetchSetupData();
  }, [currentUser]);

  const handleJobPositionChange = (e) => {
    setJobPosition(e.target.value);
  };

  const handleStartInterview = async (e) => {
    e.preventDefault();
    
    if (!jobPosition) {
      return setError('Please enter a job position');
    }

    try {
      setLoading(true);
      setError('');
      console.log('Creating interview session with:', { 
        userId: currentUser?._id, 
        jobPosition, 
        interviewType, 
        skillLevel, 
        resumeId: resumeId || undefined 
      });
      
      // First check if the server is healthy
      try {
        const healthCheck = await axios.get('/api/health', { timeout: 5000 });
        if (!healthCheck.data.status === 'ok') {
          throw new Error('Server health check failed');
        }
      } catch (healthErr) {
        console.error('Health check failed:', healthErr);
        setError('Server appears to be unavailable. Please try again in a moment.');
        setLoading(false);
        return;
      }
      
      // Create a new interview session with retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      
      // Create a function outside the loop to avoid ESLint warning
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1} to create session`);
          response = await axios.post('/api/interview/sessions', {
            userId: currentUser?._id || null, // Allow anonymous users
            jobPosition,
            interviewType,
            skillLevel,
            resumeId: resumeId || undefined,
          }, {
            timeout: 10000 // 10 seconds timeout
          });
          
          console.log('Session created successfully');
          break;
        } catch (err) {
          retryCount++;
          console.error(`Attempt ${retryCount} failed:`, err);
          
          if (retryCount >= maxRetries) {
            throw err; // Re-throw the error after all retries fail
          }
          
          // Wait before retrying (exponential backoff)
          await delay(1000 * retryCount);
        }
      }
      
      console.log('API Response:', response.data);
      
      // Navigate to the interview session
      if (response.data && response.data.session && response.data.session.sessionId) {
        const sessionId = response.data.session.sessionId;
        console.log('Navigating to session:', sessionId);
        
        // Save session info to localStorage for recovery if needed
        localStorage.setItem('lastInterviewSession', JSON.stringify({
          sessionId,
          jobPosition,
          interviewType,
          skillLevel,
          timestamp: new Date().toISOString()
        }));
        
        setLoading(false); // Set loading to false before navigation
        
        // Navigate directly without timeout
        navigate(`/interview/session/${sessionId}`);
      } else {
        console.error('Invalid response format:', response.data);
        setError('Failed to create interview session. Invalid server response.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error creating interview session:', err);
      let errorMessage = 'Failed to create interview session';
      
      if (err.response) {
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        
        // Special handling for common errors
        if (err.response.status === 400) {
          errorMessage = `Invalid input: ${err.response.data?.message || 'Please check your inputs'}`;
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = `${errorMessage}: ${err.response.data?.message || err.response.statusText}`;
        }
      } else if (err.request) {
        console.error('Error request:', err.request);
        errorMessage = `${errorMessage}: No response received from server. Please check your connection.`;
      } else {
        console.error('Error message:', err.message);
        errorMessage = `${errorMessage}: ${err.message}`;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Setup</h1>
        <p className="text-gray-600 mb-8">
          Configure your interview session to get personalized questions.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleStartInterview} className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-6">
            {/* Job Position */}
            <div>
              <label htmlFor="jobPosition" className="form-label">
                Job Position*
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="text-gray-400" size={18} />
                </span>
                <input
                  type="text"
                  id="jobPosition"
                  name="jobPosition"
                  value={jobPosition}
                  onChange={handleJobPositionChange}
                  className="form-input pl-10"
                  placeholder="E.g., Software Engineer, Product Manager"
                  required
                  list="job-positions"
                />
                <datalist id="job-positions">
                  {jobPositions.map((position, index) => (
                    <option key={index} value={position} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Interview Type */}
            <div>
              <label htmlFor="interviewType" className="form-label">
                Interview Type
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="text-gray-400" size={18} />
                </span>
                <select
                  id="interviewType"
                  name="interviewType"
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="form-input pl-10 appearance-none"
                >
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="mixed">Mixed (Technical & Behavioral)</option>
                  <option value="custom">Custom</option>
                </select>
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="text-gray-400" size={18} />
                </span>
              </div>
            </div>

            {/* Skill Level */}
            <div>
              <label htmlFor="skillLevel" className="form-label">
                Skill Level
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  className={`py-3 border rounded-md ${
                    skillLevel === 'beginner'
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-gray-300 text-gray-700'
                  }`}
                  onClick={() => setSkillLevel('beginner')}
                >
                  Beginner
                </button>
                <button
                  type="button"
                  className={`py-3 border rounded-md ${
                    skillLevel === 'intermediate'
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-gray-300 text-gray-700'
                  }`}
                  onClick={() => setSkillLevel('intermediate')}
                >
                  Intermediate
                </button>
                <button
                  type="button"
                  className={`py-3 border rounded-md ${
                    skillLevel === 'expert'
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-gray-300 text-gray-700'
                  }`}
                  onClick={() => setSkillLevel('expert')}
                >
                  Expert
                </button>
              </div>
            </div>

            {/* Resume Selection */}
            <div>
              <label htmlFor="resumeId" className="form-label">
                Resume (Optional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="text-gray-400" size={18} />
                </span>
                <select
                  id="resumeId"
                  name="resumeId"
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  className="form-input pl-10 appearance-none"
                >
                  <option value="">No Resume</option>
                  {resumes.map((resume) => (
                    <option key={resume._id} value={resume._id}>
                      {resume.name} {resume.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="text-gray-400" size={18} />
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Adding a resume allows us to generate personalized questions based on your experience.
              </p>
            </div>

            {/* Estimated Duration */}
            <div>
              <label htmlFor="duration" className="form-label">
                Estimated Duration (minutes)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="text-gray-400" size={18} />
                </span>
                <select
                  id="duration"
                  name="duration"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="form-input pl-10 appearance-none"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="text-gray-400" size={18} />
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full btn btn-primary py-3 flex justify-center items-center"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
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
                    Setting up your interview...
                  </span>
                ) : (
                  'Start Interview'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InterviewSetup; 