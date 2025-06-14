import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, ChevronDown, Clock, FileText, Shield } from 'react-feather';
import api from '../utils/api';
import { v4 as uuidv4 } from 'uuid';

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
  const [serverAvailable, setServerAvailable] = useState(true);

  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const healthCheck = await api.get('/api/health', { timeout: 3000 });
        if (healthCheck.data.status === 'ok') {
          setServerAvailable(true);
          setError('');
        } else {
          setServerAvailable(false);
          setError('Server appears to be unavailable. You can still start an interview in offline mode.');
        }
      } catch (err) {
        console.error('Health check failed:', err);
        setServerAvailable(false);
        setError('Server appears to be unavailable. You can still start an interview in offline mode.');
      }
    };

    // Check server health immediately
    checkServerHealth();

    // Set up a periodic health check
    const healthCheckInterval = setInterval(checkServerHealth, 10000);

    return () => clearInterval(healthCheckInterval);
  }, []);

  useEffect(() => {
    const fetchSetupData = async () => {
      try {
        setLoading(true);
        
        // Fetch popular job positions
        if (serverAvailable) {
          try {
            const positionsResponse = await api.get('/api/interview/positions');
            setJobPositions(positionsResponse.data.positions);
          } catch (err) {
            console.error('Error fetching positions:', err);
            // Use default positions if server fails
            setJobPositions([
              'Software Engineer',
              'Frontend Developer',
              'Backend Developer',
              'Full Stack Developer',
              'Data Scientist',
              'Product Manager',
              'UX Designer',
              'DevOps Engineer'
            ]);
          }
        } else {
          // Use default positions if server is unavailable
          setJobPositions([
            'Software Engineer',
            'Frontend Developer',
            'Backend Developer',
            'Full Stack Developer',
            'Data Scientist',
            'Product Manager',
            'UX Designer',
            'DevOps Engineer'
          ]);
        }
        
        // Fetch user's resumes if server is available
        if (serverAvailable && currentUser?._id) {
          try {
            const resumesResponse = await api.get(`/api/resume?userId=${currentUser._id}`);
            setResumes(resumesResponse.data.resumes);
            
            // Set default resume if available
            const defaultResume = resumesResponse.data.resumes.find(r => r.isDefault);
            if (defaultResume) {
              setResumeId(defaultResume._id);
            }
          } catch (err) {
            console.error('Error fetching resumes:', err);
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
        setLoading(false);
      }
    };

    fetchSetupData();
  }, [currentUser, serverAvailable]);

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
      
      // Check if the server is available
      if (serverAvailable) {
        // Try to create a session on the server
        try {
          // Create a new interview session with retry logic
          let response;
          let retryCount = 0;
          const maxRetries = 2;
          
          // Create a function outside the loop to avoid ESLint warning
          const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
          
          while (retryCount < maxRetries) {
            try {
              console.log(`Attempt ${retryCount + 1} to create session`);
              response = await api.post('/api/interview/sessions', {
                userId: currentUser?._id || null, // Allow anonymous users
                jobPosition,
                interviewType,
                skillLevel,
                resumeId: resumeId || undefined,
              }, {
                timeout: 5000 // 5 seconds timeout
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
            throw new Error('Invalid server response');
          }
        } catch (err) {
          console.error('Error creating interview session on server:', err);
          // Fall back to offline mode
          createOfflineSession();
        }
      } else {
        // Create an offline session
        createOfflineSession();
      }
    } catch (err) {
      console.error('Error in handleStartInterview:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Function to create an offline session when the server is unavailable
  const createOfflineSession = () => {
    // Generate a random session ID
    const sessionId = uuidv4();
    
    // Save session info to localStorage
    localStorage.setItem('lastInterviewSession', JSON.stringify({
      sessionId,
      jobPosition,
      interviewType,
      skillLevel,
      timestamp: new Date().toISOString(),
      isOfflineSession: true
    }));
    
    console.log('Created offline session:', sessionId);
    setLoading(false);
    
    // Navigate to the interview session
    navigate(`/interview/session/${sessionId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Setup</h1>
        <p className="text-gray-600 mb-8">
          Configure your interview session to get personalized questions.
        </p>

        {error && (
          <div className={`border rounded-md p-4 mb-6 ${serverAvailable ? 'bg-red-50 border-red-200 text-red-600' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
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
                  className="form-select pl-10"
                >
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="system-design">System Design</option>
                  <option value="mixed">Mixed</option>
                </select>
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="text-gray-400" size={18} />
                </span>
              </div>
            </div>

            {/* Skill Level */}
            <div>
              <label className="form-label">Skill Level</label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setSkillLevel('beginner')}
                  className={`py-3 px-4 border rounded-lg text-center ${
                    skillLevel === 'beginner'
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Beginner
                </button>
                <button
                  type="button"
                  onClick={() => setSkillLevel('intermediate')}
                  className={`py-3 px-4 border rounded-lg text-center ${
                    skillLevel === 'intermediate'
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Intermediate
                </button>
                <button
                  type="button"
                  onClick={() => setSkillLevel('expert')}
                  className={`py-3 px-4 border rounded-lg text-center ${
                    skillLevel === 'expert'
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
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
                  className="form-select pl-10"
                  disabled={!serverAvailable || resumes.length === 0}
                >
                  <option value="">No Resume</option>
                  {resumes.map((resume) => (
                    <option key={resume._id} value={resume._id}>
                      {resume.title}
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

            {/* Duration */}
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
                  className="form-select pl-10"
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
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Setting up interview...
                  </span>
                ) : (
                  'Start Interview'
                )}
              </button>
              
              {!serverAvailable && (
                <p className="text-sm text-yellow-600 mt-2">
                  You are in offline mode. The interview will use pre-loaded questions.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InterviewSetup; 