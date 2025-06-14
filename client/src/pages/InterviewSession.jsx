import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'react-feather';
import api from '../utils/api';
import { initializeSocket, closeSocket } from '../utils/socketClient';

function InterviewSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars
  const { currentUser } = useAuth();
  
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [debugInfo, setDebugInfo] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const videoRef = useRef(null);
  const socketRef = useRef(null);

  // Add debug information
  const addDebugInfo = useCallback((message) => {
    console.log(message);
    setDebugInfo(prev => `${prev}\n${message}`);
  }, []);

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

  // Force continue with mock data
  const forceContinue = useCallback(() => {
    console.log('Force continuing with mock data');
    
    // Try to get session data from localStorage first
    const localSession = getLocalSessionData();
    
    // Create a basic session if no local data exists
    const mockSession = {
      sessionId,
      jobPosition: localSession?.jobPosition || "Senior Frontend Engineer",
      companyName: "Reddit",
      interviewType: localSession?.interviewType || "technical",
      skillLevel: localSession?.skillLevel || "expert",
      questions: [],
      status: "in-progress",
      isMockSession: true,
      isOfflineSession: localSession?.isOfflineSession || false
    };
    
    setSession(mockSession);
    setIsOfflineMode(mockSession.isOfflineSession || false);
    
    // Create a mock question based on the job position
    const jobTitle = mockSession.jobPosition || "Software Engineer";
    
    const mockQuestion = {
      question: `Hi, welcome, I'm Braintrust AIR, and I'll be conducting your interview for the ${jobTitle} role at Reddit. Thank you for taking the time to speak with me. Let's get started: Can you share a little about yourself and your background?`,
      expectedTopics: "Experience, skills, qualifications, technical knowledge",
      isMockQuestion: true
    };
    
    setCurrentQuestion(mockQuestion);
    setLoading(false);
  }, [sessionId, getLocalSessionData]);

  // Initialize webcam
  const initializeWebcam = useCallback(async () => {
    try {
      if (!videoRef.current) return;
      
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.error("Error playing video:", e));
        };
      }
      
      console.log('Webcam initialized successfully');
      return stream;
    } catch (err) {
      console.error('Error accessing webcam:', err);
      return null;
    }
  }, []);

  // Initialize socket connection
  const initializeSocketConnection = useCallback(() => {
    // Don't initialize socket in offline mode
    if (isOfflineMode) {
      console.log('Skipping socket initialization in offline mode');
      return null;
    }
    
    try {
      // Initialize socket connection
      const socket = initializeSocket();
      socketRef.current = socket;
      
      // Join the interview session
      if (socket && sessionId) {
        socket.emit('join_interview', sessionId);
        
        // Set up event listeners
        socket.on('receive_question', (data) => {
          if (data && data.question) {
            setCurrentQuestion(data);
          }
        });
        
        addDebugInfo('Socket connection initialized');
      }
      
      return socket;
    } catch (err) {
      console.error('Error initializing socket:', err);
      return null;
    }
  }, [sessionId, addDebugInfo, isOfflineMode]);

  // Initialize the session
  useEffect(() => {
    let isMounted = true;
    let videoStream = null;
    
    const initializeSession = async () => {
      try {
        if (!isMounted) return;
        
        // Check if this is an offline session
        const localSession = getLocalSessionData();
        const offlineMode = localSession?.isOfflineSession || false;
        setIsOfflineMode(offlineMode);
        
        // Try to initialize webcam first
        videoStream = await initializeWebcam();
        
        // Use mock data immediately to ensure UI loads
        forceContinue();
        
        // Only try to fetch from server if not in offline mode
        if (!offlineMode) {
          // Initialize socket connection
          initializeSocketConnection();
          
          // Try to fetch the session data in the background
          api.get(`/api/interview/sessions/${sessionId}`)
            .then(response => {
              if (!isMounted) return;
              
              if (response.data.success && response.data.session) {
                const sessionData = response.data.session;
                setSession(sessionData);
                
                // If session has questions, get the first one
                if (sessionData.questions && sessionData.questions.length > 0) {
                  const firstQuestion = sessionData.questions[0];
                  setCurrentQuestion(firstQuestion);
                }
              }
            })
            .catch(err => {
              console.error('Error fetching session:', err);
              // Already using mock data, so no need to call forceContinue again
            });
        }
      } catch (err) {
        console.error('Error in session initialization:', err);
        forceContinue();
      }
    };

    initializeSession();
    
    return () => {
      isMounted = false;
      // Clean up video stream
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      // Clean up socket connection
      if (!isOfflineMode) {
        closeSocket();
      }
    };
  }, [sessionId, forceContinue, initializeWebcam, initializeSocketConnection, getLocalSessionData, isOfflineMode]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading interview session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 mb-6">
            <h3 className="font-bold mb-2">Error</h3>
            <p>{error}</p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Main interview interface - redesigned to match the screenshot
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-lg overflow-hidden">
        {/* Main content area */}
        <div className="p-6 md:p-10">
          {/* Interviewer's message */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
            <p className="text-gray-800 text-lg">
              {currentQuestion?.question || "Loading question..."}
            </p>
          </div>
          
          {/* User video and controls */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* User video */}
            <div className="w-full md:w-1/3">
              <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-[4/3] relative">
                <video 
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            {/* Braintrust logo */}
            <div className="w-full md:w-2/3 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full bg-purple-100 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-16 h-16 text-indigo-500">
                    <path 
                      fill="currentColor" 
                      d="M50,15 C65,15 75,25 75,40 C75,48 70,55 65,60 C70,65 75,72 75,80 C75,95 65,105 50,105 C35,105 25,95 25,80 C25,72 30,65 35,60 C30,55 25,48 25,40 C25,25 35,15 50,15 Z M50,25 C40,25 35,32 35,40 C35,48 40,55 50,55 C60,55 65,48 65,40 C65,32 60,25 50,25 Z M50,65 C40,65 35,72 35,80 C35,88 40,95 50,95 C60,95 65,88 65,80 C65,72 60,65 50,65 Z" 
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-white border-t">
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <svg viewBox="0 0 100 100" className="w-8 h-8 text-indigo-500">
                <path 
                  fill="currentColor" 
                  d="M50,15 C65,15 75,25 75,40 C75,48 70,55 65,60 C70,65 75,72 75,80 C75,95 65,105 50,105 C35,105 25,95 25,80 C25,72 30,65 35,60 C30,55 25,48 25,40 C25,25 35,15 50,15 Z M50,25 C40,25 35,32 35,40 C35,48 40,55 50,55 C60,55 65,48 65,40 C65,32 60,25 50,25 Z M50,65 C40,65 35,72 35,80 C35,88 40,95 50,95 C60,95 65,88 65,80 C65,72 60,65 50,65 Z" 
                />
              </svg>
              <span className="ml-2 font-medium text-gray-700">Braintrust AIR</span>
            </div>
            <div className="h-4 border-r border-gray-300"></div>
            <span className="text-gray-700">{session?.jobPosition || "Interview"}</span>
            {isOfflineMode && (
              <>
                <div className="h-4 border-r border-gray-300"></div>
                <span className="text-yellow-600 text-sm">Offline Mode</span>
              </>
            )}
          </div>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="px-4 py-2 rounded-full bg-purple-50 text-purple-800 hover:bg-purple-100 transition-colors flex items-center"
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