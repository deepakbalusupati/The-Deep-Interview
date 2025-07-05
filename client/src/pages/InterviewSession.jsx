import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'react-feather';
import api from '../utils/api';
import { initializeSocket, closeSocket, joinInterviewSession } from '../utils/socketClient';

function InterviewSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);

  // Get session data from localStorage if available
  const getLocalSessionData = useCallback(() => {
    try {
      const savedSession = localStorage.getItem('lastInterviewSession');
      if (savedSession) {
        const parsedSession = JSON.parse(savedSession);
        if (parsedSession.sessionId === sessionId) {
          return parsedSession;
        }
      }
    } catch (err) {
      console.error('Error parsing saved session:', err);
    }
    return null;
  }, [sessionId]);

  // Initialize webcam
  const initializeWebcam = useCallback(async () => {
    try {
      setVideoError('');
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        console.log('Camera initialized successfully');
      }

      return stream;
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      let errorMessage = 'Camera access failed: ';
      
      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          errorMessage += 'Camera permission denied. Please allow camera access and refresh the page.';
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          errorMessage += 'No camera found. Please connect a camera and try again.';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          errorMessage += 'Camera is being used by another application.';
          break;
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
          errorMessage += 'Camera does not meet requirements.';
          break;
        case 'NotSupportedError':
          errorMessage += 'Camera access not supported in this browser.';
          break;
        case 'AbortError':
          errorMessage += 'Camera access was aborted.';
          break;
        default:
          errorMessage += error.message || 'Unknown camera error.';
      }
      
      setVideoError(errorMessage);
      return null;
    }
  }, []);

  // Initialize socket connection
  const initializeSocketConnection = useCallback(() => {
    if (isOfflineMode) {
      console.log('Skipping socket initialization in offline mode');
      return null;
    }

    try {
      console.log('Initializing socket connection...');
      const socket = initializeSocket();
      
      if (socket) {
        socketRef.current = socket;
        
        // Set up connection listeners
        socket.on('connect', () => {
          console.log('Socket connected, joining interview session');
          setSocketConnected(true);
          joinInterviewSession(sessionId);
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected');
          setSocketConnected(false);
        });

        // Set up interview-specific listeners
        socket.on('receive_question', (data) => {
          console.log('Received question from socket:', data);
          if (data && data.question) {
            setCurrentQuestion(data);
          }
        });

        socket.on('joined_interview', (data) => {
          console.log('Successfully joined interview session:', data);
        });

        socket.on('error', (error) => {
          console.error('Socket error:', error);
        });
      }
      
      return socket;
    } catch (err) {
      console.error('Error initializing socket:', err);
      return null;
    }
  }, [sessionId, isOfflineMode]);

  // Create mock session for offline/fallback mode
  const createMockSession = useCallback(() => {
    console.log('Creating mock session for fallback');
    
    const localSession = getLocalSessionData();
    
    const mockSession = {
      sessionId,
      jobPosition: localSession?.jobPosition || "Software Engineer",
      companyName: "Tech Company",
      interviewType: localSession?.interviewType || "technical",
      skillLevel: localSession?.skillLevel || "intermediate",
      questions: [],
      status: "in-progress",
      isMockSession: true,
      isOfflineSession: localSession?.isOfflineSession || false
    };
    
    setSession(mockSession);
    setIsOfflineMode(mockSession.isOfflineSession || false);
    
    // Create a mock question
    const jobTitle = mockSession.jobPosition || "Software Engineer";
    
    const mockQuestion = {
      question: `Hi, welcome! I'm conducting your interview for the ${jobTitle} position. Thank you for taking the time to speak with me. Let's get started: Can you share a little about yourself and your background?`,
      expectedTopics: "Experience, skills, qualifications, technical knowledge",
      isMockQuestion: true
    };
    
    setCurrentQuestion(mockQuestion);
    setLoading(false);
  }, [sessionId, getLocalSessionData]);

  // Load session data
  const loadSessionData = useCallback(async () => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    try {
      console.log('Loading session data for:', sessionId);
      
      // Check for offline mode first
      const localSession = getLocalSessionData();
      if (localSession?.isOfflineSession) {
        console.log('Detected offline session');
        setIsOfflineMode(true);
        createMockSession();
        return;
      }

      // Try to fetch from server
      const response = await api.get(`/api/interview/sessions/${sessionId}`);
      
      if (response.data.success && response.data.session) {
        const sessionData = response.data.session;
        console.log('Session loaded from server:', sessionData);
        
        setSession(sessionData);
        
        // Set current question if available
        if (sessionData.questions && sessionData.questions.length > 0) {
          const lastQuestion = sessionData.questions[sessionData.questions.length - 1];
          setCurrentQuestion(lastQuestion);
        } else {
          // Generate first question if none exist
          console.log('No questions found, generating initial question');
          await generateInitialQuestion(sessionData);
        }
        
        setLoading(false);
      } else {
        throw new Error('Invalid session data received');
      }
    } catch (error) {
      console.error('Error loading session data:', error);
      
      // Fall back to mock session
      console.log('Falling back to mock session');
      createMockSession();
    }
  }, [sessionId, getLocalSessionData, createMockSession]);

  // Generate initial question for session
  const generateInitialQuestion = async (sessionData) => {
    try {
      const response = await api.post('/api/interview/questions', {
        jobPosition: sessionData.jobPosition,
        skillLevel: sessionData.skillLevel,
        interviewType: sessionData.interviewType,
        sessionId: sessionData.sessionId
      });

      if (response.data.success && response.data.questions && response.data.questions.length > 0) {
        const firstQuestion = response.data.questions[0];
        setCurrentQuestion(firstQuestion);
        console.log('Generated initial question:', firstQuestion);
      }
    } catch (error) {
      console.error('Error generating initial question:', error);
      // Use fallback question
      setCurrentQuestion({
        question: `Welcome to your ${sessionData.interviewType} interview for the ${sessionData.jobPosition} position. Please tell me about yourself and your background.`,
        expectedTopics: "Background, experience, skills",
        isFallbackQuestion: true
      });
    }
  };

  // Main initialization effect
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        console.log('Initializing interview session...');
        
        // Initialize webcam
        const stream = await initializeWebcam();
        
        if (!isMounted) return;
        
        // Load session data
        await loadSessionData();
        
        if (!isMounted) return;
        
        // Initialize socket if not in offline mode
        if (!isOfflineMode) {
          initializeSocketConnection();
        }
        
      } catch (error) {
        console.error('Error during initialization:', error);
        if (isMounted) {
          setError('Failed to initialize interview session. Please try again.');
          setLoading(false);
        }
      }
    };

    initialize();

    // Cleanup function
    return () => {
      isMounted = false;
      
      // Clean up video stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Clean up socket connection
      if (socketRef.current && !isOfflineMode) {
        closeSocket();
        socketRef.current = null;
      }
    };
  }, [sessionId, initializeWebcam, loadSessionData, initializeSocketConnection, isOfflineMode]);

  // Handle navigation back
  const handleBackNavigation = useCallback(() => {
    if (window.confirm('Are you sure you want to leave the interview? Your progress may be lost.')) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading interview session...</p>
          {sessionId && (
            <p className="mt-2 text-sm text-gray-500">Session ID: {sessionId}</p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 mb-6">
            <h3 className="font-bold mb-2">Error</h3>
            <p>{error}</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleBackNavigation} 
              className="btn btn-primary"
            >
              Back to Dashboard
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-secondary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main interview interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-lg overflow-hidden">
        {/* Main content area */}
        <div className="p-6 md:p-10">
          {/* Status indicators */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              {!isOfflineMode && (
                <div className={`flex items-center space-x-2 ${socketConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm font-medium">
                    {socketConnected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
              )}
              {isOfflineMode && (
                <div className="flex items-center space-x-2 text-orange-600">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span className="text-sm font-medium">Offline Mode</span>
                </div>
              )}
              {videoError && (
                <div className="flex items-center space-x-2 text-red-600">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-sm font-medium">Camera Error</span>
                </div>
              )}
            </div>
          </div>

          {/* Interviewer's message */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
            <p className="text-gray-800 text-lg leading-relaxed">
              {currentQuestion?.question || "Loading question..."}
            </p>
            {currentQuestion?.isMockQuestion && (
              <p className="text-sm text-blue-600 mt-2">
                [This is a mock question for demonstration]
              </p>
            )}
            {currentQuestion?.isFallbackQuestion && (
              <p className="text-sm text-yellow-600 mt-2">
                [Fallback question - server unavailable]
              </p>
            )}
          </div>
          
          {/* Video and error display */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* User video */}
            <div className="w-full md:w-1/3">
              <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-[4/3] relative">
                {videoError ? (
                  <div className="flex items-center justify-center h-full p-4 text-center">
                    <div>
                      <div className="text-red-500 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-red-600 text-sm font-medium mb-2">Camera unavailable</p>
                      <button 
                        onClick={initializeWebcam}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                ) : (
                  <video 
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
            
            {/* Interview info */}
            <div className="w-full md:w-2/3 flex items-center justify-center">
              <div className="text-center">
                <div className="w-40 h-40 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-6">
                  <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-16 h-16 text-indigo-500">
                      <path 
                        fill="currentColor" 
                        d="M50,15 C65,15 75,25 75,40 C75,48 70,55 65,60 C70,65 75,72 75,80 C75,95 65,105 50,105 C35,105 25,95 25,80 C25,72 30,65 35,60 C30,55 25,48 25,40 C25,25 35,15 50,15 Z M50,25 C40,25 35,32 35,40 C35,48 40,55 50,55 C60,55 65,48 65,40 C65,32 60,25 50,25 Z M50,65 C40,65 35,72 35,80 C35,88 40,95 50,95 C60,95 65,88 65,80 C65,72 60,65 50,65 Z" 
                      />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Interviewer</h2>
                <p className="text-gray-600">
                  {session?.jobPosition ? `${session.jobPosition} Interview` : 'Interview in Progress'}
                </p>
                {session?.interviewType && (
                  <p className="text-sm text-gray-500 mt-1">
                    {session.interviewType.charAt(0).toUpperCase() + session.interviewType.slice(1)} • {session.skillLevel}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <svg viewBox="0 0 100 100" className="w-8 h-8 text-indigo-500">
                <path 
                  fill="currentColor" 
                  d="M50,15 C65,15 75,25 75,40 C75,48 70,55 65,60 C70,65 75,72 75,80 C75,95 65,105 50,105 C35,105 25,95 25,80 C25,72 30,65 35,60 C30,55 25,48 25,40 C25,25 35,15 50,15 Z M50,25 C40,25 35,32 35,40 C35,48 40,55 50,55 C60,55 65,48 65,40 C65,32 60,25 50,25 Z M50,65 C40,65 35,72 35,80 C35,88 40,95 50,95 C60,95 65,88 65,80 C65,72 60,65 50,65 Z" 
                />
              </svg>
              <span className="ml-2 font-medium text-gray-700">Interview Session</span>
            </div>
            <div className="h-4 border-r border-gray-300"></div>
            <span className="text-gray-700">{session?.jobPosition || "Interview"}</span>
            {isOfflineMode && (
              <>
                <div className="h-4 border-r border-gray-300"></div>
                <span className="text-orange-600 text-sm">Offline Mode</span>
              </>
            )}
          </div>
          <button 
            onClick={handleBackNavigation} 
            className="px-4 py-2 rounded-full bg-red-50 text-red-800 hover:bg-red-100 transition-colors flex items-center"
          >
            <ArrowLeft size={16} className="mr-2" />
            Leave interview
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterviewSession; 