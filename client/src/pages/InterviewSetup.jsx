import React, { useState, useEffect, useCallback } from 'react';
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
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [resumesFetched, setResumesFetched] = useState(false);

  // Memoize server health check to prevent unnecessary calls
  const checkServerHealth = useCallback(async () => {
    try {
      const healthCheck = await api.getWithCache('/api/health', { timeout: 3000 });
      if (healthCheck.data.status === 'ok') {
        setServerAvailable(true);
        setError('');
      } else {
        setServerAvailable(false);
        setError('Server appears to be unavailable. You can still start an interview in offline mode.');
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Health check failed:', err);
      }
      setServerAvailable(false);
      setError('Server appears to be unavailable. You can still start an interview in offline mode.');
    }
  }, []);

  useEffect(() => {
    // Check server health immediately
    checkServerHealth();

    // Set up a periodic health check
    const healthCheckInterval = setInterval(checkServerHealth, 10000);

    return () => clearInterval(healthCheckInterval);
  }, [checkServerHealth]);

  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchSetupData = useCallback(async () => {
    try {
      setLoading(true);
      
      const defaultPositions = [
        'Software Engineer',
        'Frontend Developer',
        'Backend Developer',
        'Full Stack Developer',
        'Data Scientist',
        'Product Manager',
        'UX Designer',
        'DevOps Engineer'
      ];
      
      // Fetch popular job positions and resumes in parallel
      const promises = [];
      
      if (serverAvailable) {
        promises.push(
          api.getWithCache('/api/interview/positions').catch(err => {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching positions:', err);
            }
            return { data: { positions: defaultPositions } };
          })
        );
        
        if (currentUser?._id) {
          promises.push(
            api.getWithCache('/api/resume').catch(err => {
              if (process.env.NODE_ENV === 'development') {
                console.error('Error fetching resumes:', err);
              }
              return { data: { success: false, resumes: [] } };
            })
          );
        }
      }
      
      const results = await Promise.all(promises);
      
      // Process positions
      if (results[0]) {
        setJobPositions(results[0].data.positions || defaultPositions);
      } else {
        setJobPositions(defaultPositions);
      }
      
      // Process resumes
      if (results[1] && results[1].data.success) {
        setResumes(results[1].data.resumes || []);
        
        // Set default resume if available
        const defaultResume = results[1].data.resumes?.find(r => r.isDefault);
        if (defaultResume) {
          setResumeId(defaultResume._id);
        }
      } else {
        setResumes([]);
      }
      
      setResumesFetched(true);
      
      // Set default values from user's profile/preferences
      if (currentUser?.professionalDetails?.currentPosition) {
        setJobPosition(currentUser.professionalDetails.currentPosition);
      }
      
      if (currentUser?.preferences?.defaultInterviewType) {
        setInterviewType(currentUser.preferences.defaultInterviewType);
      }
      
      if (currentUser?.preferences?.defaultSkillLevel) {
        setSkillLevel(currentUser.preferences.defaultSkillLevel);
      }
      
      setLoading(false);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching setup data:', err);
      }
      setLoading(false);
    }
  }, [currentUser?._id, currentUser?.professionalDetails?.currentPosition, currentUser?.preferences?.defaultInterviewType, currentUser?.preferences?.defaultSkillLevel, serverAvailable]);

  useEffect(() => {
    fetchSetupData();
  }, [fetchSetupData]);

  const handleJobPositionChange = (e) => {
    setJobPosition(e.target.value);
  };

  const handleResumeChange = useCallback(async (e) => {
    const selectedResumeId = e.target.value;
    setResumeId(selectedResumeId);
    
    if (selectedResumeId && serverAvailable) {
      try {
        setAnalyzingResume(true);
        setError('');
        
        // Get the selected resume
        const selectedResume = resumes.find(r => r._id === selectedResumeId);
        if (!selectedResume) {
          setError('Selected resume not found');
          return;
        }
        
        // Call backend to analyze resume and extract job position
        const response = await api.postWithDedup('/api/resume/extract-position', {
          resumeId: selectedResumeId
        });
        
        if (response.data.success && response.data.suggestedPosition) {
          setJobPosition(response.data.suggestedPosition);
        }
        
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error analyzing resume:', err);
        }
        // Don't show error for resume analysis failure, just continue
      } finally {
        setAnalyzingResume(false);
      }
    }
  }, [resumes, serverAvailable]);

  const handleStartInterview = async (e) => {
    e.preventDefault();
    
    // Validate all required fields
    const missingFields = [];
    
    if (!jobPosition) missingFields.push('Job Position');
    if (!interviewType) missingFields.push('Interview Type');
    if (!skillLevel) missingFields.push('Skill Level');
    if (!resumeId) missingFields.push('Resume');
    if (!duration) missingFields.push('Duration');
    
    if (missingFields.length > 0) {
      return setError(`Please complete the following required fields: ${missingFields.join(', ')}`);
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
          Configure your interview session to get personalized questions. All fields marked with * are required.
        </p>

        {error && (
          <div className={`border rounded-md p-4 mb-6 ${serverAvailable ? 'bg-red-50 border-red-200 text-red-600' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
            {error}
          </div>
        )}



        {serverAvailable && resumesFetched && resumes.length === 0 && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-4">
                <FileText className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes found</h3>
              <p className="text-gray-500 mb-6">
                To start your interview, you'll need to upload a resume first. Your resume helps us create personalized questions tailored to your experience.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a 
                  href="/resume" 
                  className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors shadow-sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Upload Resume
                </a>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
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
              {resumeId && jobPosition && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Job position auto-filled from your resume (you can edit this if needed)
                </p>
              )}
            </div>

            {/* Interview Type */}
            <div>
              <label htmlFor="interviewType" className="form-label">
                Interview Type*
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
                  required
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
              <label className="form-label">Skill Level*</label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setSkillLevel('beginner')}
                  className={`py-3 px-4 border rounded-lg text-center transition-colors ${
                    skillLevel === 'beginner'
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-primary-200'
                  }`}
                >
                  {skillLevel === 'beginner' && <span className="mr-1">✓</span>}
                  Beginner
                </button>
                <button
                  type="button"
                  onClick={() => setSkillLevel('intermediate')}
                  className={`py-3 px-4 border rounded-lg text-center transition-colors ${
                    skillLevel === 'intermediate'
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-primary-200'
                  }`}
                >
                  {skillLevel === 'intermediate' && <span className="mr-1">✓</span>}
                  Intermediate
                </button>
                <button
                  type="button"
                  onClick={() => setSkillLevel('expert')}
                  className={`py-3 px-4 border rounded-lg text-center transition-colors ${
                    skillLevel === 'expert'
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-primary-200'
                  }`}
                >
                  {skillLevel === 'expert' && <span className="mr-1">✓</span>}
                  Expert
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Please select your skill level to continue.
              </p>
            </div>

            {/* Resume Selection */}
            <div>
              <label htmlFor="resumeId" className="form-label">
                Resume*
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="text-gray-400" size={18} />
                </span>
                <select
                  id="resumeId"
                  name="resumeId"
                  value={resumeId}
                  onChange={handleResumeChange}
                  className={`form-select pl-10 ${(!serverAvailable || analyzingResume || !resumesFetched) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!serverAvailable || analyzingResume || !resumesFetched}
                  required
                >
                  <option value="">
                    {!resumesFetched ? 'Loading resumes...' : 
                     resumes.length === 0 ? 'No resumes available' : 'Select'}
                  </option>
                  {resumes.map((resume) => (
                    <option key={resume._id} value={resume._id}>
                      {resume.name || resume.title}
                    </option>
                  ))}
                </select>
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="text-gray-400" size={18} />
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {resumes.length === 0 ? (
                  <>
                    No resumes found. 
                    <a href="/resume" className="text-primary-600 hover:text-primary-800 underline ml-1">
                      Upload a resume first
                    </a>
                  </>
                ) : (
                  <>
                    The system will analyze your resume to determine the best job position for your interview.
                    {analyzingResume && (
                      <span className="text-primary-600 ml-2">
                        <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600 mr-1"></span>
                        Analyzing resume...
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="duration" className="form-label">
                Estimated Duration (minutes)*
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
                  required
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
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={loading || (serverAvailable && resumes.length === 0) || !jobPosition || !interviewType || !skillLevel || !resumeId || !duration}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Setting up interview...
                  </span>
                ) : serverAvailable && resumes.length === 0 ? (
                  'Upload Resume First'
                ) : (!jobPosition || !interviewType || !skillLevel || !resumeId || !duration) ? (
                  'Complete All Fields'
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