import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Send, Mic, MicOff, Settings, RefreshCw } from 'react-feather';

// Configure axios defaults
axios.defaults.timeout = 30000; // 30 seconds timeout

function InterviewSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [response, setResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [networkError, setNetworkError] = useState(null);

  // Add debug information - wrapped in useCallback to avoid dependency issues
  const addDebugInfo = useCallback((message) => {
    console.log(message);
    setDebugInfo(prev => `${prev}\n${message}`);
  }, []);

  // Create a mock question if needed
  const createMockQuestion = useCallback(() => {
    if (!session) return null;
    
    addDebugInfo('Creating mock question as fallback');
    return {
      question: `[MOCK] Tell me about your experience and skills related to ${session.jobPosition || 'this position'}.`,
      expectedTopics: 'Experience, skills, qualifications'
    };
  }, [session, addDebugInfo]);

  // Force continue with mock data
  const forceContinue = useCallback(() => {
    addDebugInfo('Force continuing with mock data');
    setLoading(false);
    
    // Create a basic session if it doesn't exist
    if (!session) {
      const sessionId = window.location.pathname.split('/').pop();
      const mockSession = {
        sessionId,
        jobPosition: "Software Developer",
        interviewType: "technical",
        skillLevel: "intermediate",
        questions: [],
        status: "in-progress",
        isMockSession: true
      };
      
      addDebugInfo('Created mock session');
      setSession(mockSession);
      
      // Create a mock question
      const mockQuestion = {
        question: "[MOCK] Tell me about your background and skills relevant to software development.",
        expectedTopics: "Experience, skills, qualifications, technical knowledge",
        isMockQuestion: true
      };
      
      addDebugInfo('Created mock question');
      setCurrentQuestion(mockQuestion);
    } else if (!currentQuestion) {
      // Create a mock question based on the session
      const mockQuestion = {
        question: `[MOCK] Tell me about your experience and skills related to ${session.jobPosition || 'software development'}.`,
        expectedTopics: 'Experience, skills, qualifications, technical knowledge',
        isMockQuestion: true
      };
      
      addDebugInfo('Created mock question based on session');
      setCurrentQuestion(mockQuestion);
    } else {
      addDebugInfo('Session and question already exist, continuing with current data');
    }
  }, [session, currentQuestion, addDebugInfo]);

  // Fetch the next question
  const fetchNextQuestion = useCallback(async () => {
    if (!sessionId) {
      addDebugInfo('No sessionId available for fetchNextQuestion');
      return;
    }
    
    if (!session) {
      addDebugInfo('No session data available for fetchNextQuestion');
      return;
    }
    
    try {
      setIsThinking(true);
      addDebugInfo('Fetching next question...');
      
      const requestData = {
        sessionId,
        jobPosition: session.jobPosition,
        skillLevel: session.skillLevel,
        interviewType: session.interviewType,
        previousQuestions: session.questions?.map(q => q.question) || []
      };
      
      addDebugInfo(`Sending request with data: ${JSON.stringify(requestData)}`);
      
      // Set a timeout to use mock data if the request takes too long
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout - using mock data'));
        }, 8000); // 8 second timeout
      });
      
      // Race between the actual request and the timeout
      const response = await Promise.race([
        axios.post('/api/interview/questions', requestData),
        timeoutPromise
      ]);
      
      addDebugInfo(`Question API response: ${response.status}`);
      
      if (response.data.success && response.data.questions && response.data.questions.length > 0) {
        const questionData = response.data.questions[0];
        addDebugInfo(`New question received: ${questionData.question.substring(0, 30)}...`);
        setCurrentQuestion(questionData);
      } else {
        addDebugInfo('Invalid question data received from server');
        throw new Error('Invalid question data format');
      }
    } catch (err) {
      console.error('Error fetching next question:', err);
      let errorMessage = 'Failed to fetch interview question';
      
      if (err.response) {
        errorMessage = `${errorMessage}: ${err.response.data?.message || err.response.statusText}`;
      } else if (err.request) {
        errorMessage = `${errorMessage}: No response received from server`;
      } else {
        errorMessage = `${errorMessage}: ${err.message}`;
      }
      
      addDebugInfo(`Error: ${errorMessage}`);
      
      // Always use a mock question as fallback after error
      const mockQuestion = createMockQuestion();
      addDebugInfo('Using mock question as fallback after error');
      setCurrentQuestion(mockQuestion);
    } finally {
      setIsThinking(false);
    }
  }, [sessionId, session, createMockQuestion, addDebugInfo]);

  // Initialize the session
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount
    let timeoutId = null;
    
    const initializeSession = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        addDebugInfo(`Initializing session: ${sessionId}`);
        
        // Set a timeout to show a refresh option if loading takes too long
        timeoutId = setTimeout(() => {
          if (!isMounted) return;
          setLoadingTimeout(true);
          addDebugInfo('Loading timeout reached - showing refresh option');
        }, 5000);
        
        // Log the API endpoint we're calling
        addDebugInfo(`Calling API endpoint: /api/interview/sessions/${sessionId}`);
        
        // Add authorization header if user is logged in
        const headers = {};
        if (currentUser && currentUser.token) {
          headers['Authorization'] = `Bearer ${currentUser.token}`;
          addDebugInfo('Added authorization header');
        } else {
          addDebugInfo('No auth token available');
        }
        
        // Set a timeout to use mock data if the request takes too long
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Session request timeout - using mock data'));
          }, 10000); // 10 second timeout
        });
        
        // Race between the actual request and the timeout
        const response = await Promise.race([
          axios.get(`/api/interview/sessions/${sessionId}`, {
            headers
          }),
          timeoutPromise
        ]);
        
        // Clear the timeout since we got a response
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (!isMounted) return;
        addDebugInfo(`Session data received: ${response.status}`);
        
        if (response.data.success && response.data.session) {
          const sessionData = response.data.session;
          addDebugInfo(`Session found: ${sessionData.jobPosition} - ${sessionData.interviewType}`);
          setSession(sessionData);
          
          // If session already has questions, get the current one
          if (sessionData.questions && sessionData.questions.length > 0) {
            addDebugInfo(`Session has ${sessionData.questions.length} questions`);
            const answeredQuestions = sessionData.questions.filter(q => q.response);
            addDebugInfo(`${answeredQuestions.length} questions have been answered`);
            
            if (answeredQuestions.length < sessionData.questions.length) {
              // Find the first unanswered question
              const nextQuestion = sessionData.questions.find(q => !q.response);
              addDebugInfo(`Found unanswered question: ${nextQuestion.question.substring(0, 30)}...`);
              setCurrentQuestion(nextQuestion);
              setLoading(false);
            } else if (sessionData.status === 'completed') {
              // All questions answered and session completed
              addDebugInfo('Session is marked as completed');
              setIsCompleted(true);
              setLoading(false);
            } else {
              // Get the next question from the API
              addDebugInfo('All existing questions answered, fetching next question');
              setLoading(false);
              if (isMounted) {
                setTimeout(() => fetchNextQuestion(), 500); // Add a small delay
              }
            }
          } else {
            // No questions yet, fetch the first one
            addDebugInfo('No questions in session, fetching first question');
            setLoading(false);
            if (isMounted) {
              setTimeout(() => fetchNextQuestion(), 500); // Add a small delay
            }
          }
        } else {
          addDebugInfo('Invalid session data received from server');
          addDebugInfo('Attempting to continue with mock data');
          if (isMounted) forceContinue();
        }
      } catch (err) {
        console.error('Error initializing session:', err);
        let errorMessage = 'Failed to initialize interview session';
        
        if (err.response) {
          console.error('Error response data:', err.response.data);
          console.error('Error response status:', err.response.status);
          if (isMounted) {
            setNetworkError({
              status: err.response.status,
              data: err.response.data
            });
          }
          
          // Special handling for common errors
          if (err.response.status === 404) {
            errorMessage = 'Interview session not found. It may have been deleted or expired.';
          } else if (err.response.status === 500) {
            errorMessage = 'Server error. Please try refreshing the page or starting a new interview.';
          } else {
            errorMessage = `${errorMessage}: ${err.response.data?.message || err.response.statusText}`;
          }
        } else if (err.request) {
          console.error('Error request:', err.request);
          errorMessage = `${errorMessage}: No response received from server`;
          if (isMounted) {
            setNetworkError({
              type: 'request',
              message: 'No response received from server'
            });
          }
        } else {
          console.error('Error message:', err.message);
          errorMessage = `${errorMessage}: ${err.message}`;
          if (isMounted) {
            setNetworkError({
              type: 'general',
              message: err.message
            });
          }
        }
        
        addDebugInfo(`Error: ${errorMessage}`);
        if (isMounted) {
          setError(errorMessage);
          setLoading(false);
        }
        
        // Try to create a mock session after error
        setTimeout(() => {
          if (isMounted && loading) {
            addDebugInfo('Still loading after error, trying mock data');
            forceContinue();
          }
        }, 1500);
      }
    };

    if (sessionId) {
      initializeSession();
    } else {
      addDebugInfo('No sessionId provided');
      setError('No session ID provided');
      setLoading(false);
    }
    
    // Setup timer
    const timerInterval = setInterval(() => {
      if (isMounted) {
        setTimer(prevTimer => prevTimer + 1);
      }
    }, 1000);
    
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(timerInterval);
    };
  }, [sessionId, currentUser, addDebugInfo, forceContinue]);

  // Handle manual refresh
  const handleRefresh = () => {
    window.location.reload();
  };

  // Submit the response to the current question
  const submitResponse = async () => {
    if (!response.trim()) {
      return;
    }
    
    try {
      setIsThinking(true);
      addDebugInfo('Submitting response for session: ' + sessionId);
      
      const responseData = {
        sessionId: sessionId,
        questionIndex: session?.questions?.length || 0,
        response: response.trim()
      };
      
      addDebugInfo(`Submitting response data: ${JSON.stringify(responseData)}`);
      
      // Set a timeout to continue if the request takes too long
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Response submission timeout - continuing anyway'));
        }, 8000); // 8 second timeout
      });
      
      try {
        // Race between the actual request and the timeout
        const result = await Promise.race([
          axios.post('/api/interview/response', responseData),
          timeoutPromise
        ]);
        
        addDebugInfo(`Response submission result: ${result.status}`);
      } catch (submitErr) {
        addDebugInfo(`Error submitting response: ${submitErr.message}`);
        // Continue even if submission fails
      }
      
      // Clear the response input
      setResponse('');
      
      // Fetch the next question regardless of submission success
      fetchNextQuestion();
    } catch (err) {
      console.error('Error in response submission flow:', err);
      let errorMessage = 'Failed to submit your response';
      
      if (err.response) {
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        errorMessage = `${errorMessage}: ${err.response.data?.message || err.response.statusText}`;
      } else if (err.request) {
        console.error('Error request:', err.request);
        errorMessage = `${errorMessage}: No response received from server`;
      } else {
        console.error('Error message:', err.message);
        errorMessage = `${errorMessage}: ${err.message}`;
      }
      
      addDebugInfo(`Error: ${errorMessage}`);
      
      // Try to continue with next question anyway
      setResponse('');
      fetchNextQuestion();
      setIsThinking(false);
    }
  };

  // End the interview session
  const endInterview = async () => {
    try {
      console.log('Ending interview session:', sessionId);
      
      const result = await axios.patch(`/api/interview/sessions/${sessionId}/status`, {
        status: 'completed'
      });
      
      console.log('End interview result:', result.data);
      
      navigate(`/interview/results/${sessionId}`);
    } catch (err) {
      console.error('Error ending interview:', err);
      let errorMessage = 'Failed to end the interview';
      
      if (err.response) {
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        errorMessage = `${errorMessage}: ${err.response.data?.message || err.response.statusText}`;
      } else if (err.request) {
        console.error('Error request:', err.request);
        errorMessage = `${errorMessage}: No response received from server`;
      } else {
        console.error('Error message:', err.message);
        errorMessage = `${errorMessage}: ${err.message}`;
      }
      
      setError(errorMessage);
    }
  };

  // Toggle microphone
  const toggleMicrophone = () => {
    setIsMicActive(!isMicActive);
    // Implement actual microphone functionality here
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <h2 className="text-2xl font-semibold mt-4">Loading interview session...</h2>
          <p className="text-gray-600 mt-2">Please wait while we prepare your interview.</p>
          
          {loadingTimeout && (
            <div className="mt-8">
              <p className="text-yellow-600 mb-4">This is taking longer than expected.</p>
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={handleRefresh} 
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Refresh
                </button>
                <button 
                  onClick={forceContinue} 
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Continue with Mock Interview
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-4">
                "Continue with Mock Interview" will use generated questions instead of waiting for the server.
              </p>
            </div>
          )}
          
          {/* Debug information - always shown when there's an issue */}
          <div className="mt-8 text-left">
            <details open>
              <summary className="cursor-pointer text-sm text-gray-500">Debug Information</summary>
              <pre className="mt-2 text-xs whitespace-pre-wrap bg-gray-100 p-4 rounded text-left overflow-auto max-h-64">
                Session ID: {sessionId || 'Not available'}
                {debugInfo}
                
                {networkError && (
                  <>
                    {"\n\n"}Network Error Details:{"\n"}
                    {JSON.stringify(networkError, null, 2)}
                  </>
                )}
              </pre>
            </details>
          </div>
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
            
            {/* Show debug info in development */}
            {process.env.NODE_ENV === 'development' && debugInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm">Debug Information</summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap bg-gray-100 p-2 rounded">
                  {debugInfo}
                </pre>
              </details>
            )}
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

  if (isCompleted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Interview Completed!</h2>
          <p className="text-gray-600 mb-8">
            You've completed all the questions in this interview session. Would you like to see your results?
          </p>
          <button 
            onClick={() => navigate(`/interview/results/${sessionId}`)} 
            className="btn btn-primary mx-2"
          >
            View Results
          </button>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn btn-outline mx-2"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Add a fallback if session or currentQuestion is missing
  if (!session || !currentQuestion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-600 rounded-md p-4 mb-6">
            <h3 className="font-bold mb-2">Warning</h3>
            <p>Interview data is not fully loaded. Please wait a moment or try refreshing the page.</p>
            
            {/* Show debug info in development */}
            {process.env.NODE_ENV === 'development' && debugInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm">Debug Information</summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap bg-gray-100 p-2 rounded">
                  {debugInfo}
                </pre>
              </details>
            )}
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="btn btn-outline"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white p-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold">{session?.jobPosition} Interview</h1>
                <p className="text-sm text-primary-100">
                  {session?.interviewType.charAt(0).toUpperCase() + session?.interviewType.slice(1)} - {session?.skillLevel.charAt(0).toUpperCase() + session?.skillLevel.slice(1)}
                </p>
              </div>
              <div className="flex items-center">
                <div className="bg-primary-500 rounded-md px-3 py-1 text-sm font-medium">
                  Time: {formatTime(timer)}
                </div>
                <button className="ml-4 p-2 hover:bg-primary-500 rounded-full">
                  <Settings size={20} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Interview Area */}
          <div className="p-6">
            {/* Question Display */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Question:</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                {isThinking ? (
                  <div className="flex items-center">
                    <div className="animate-pulse flex space-x-4">
                      <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-800">{currentQuestion?.question || "No question available"}</p>
                )}
              </div>
            </div>
            
            {/* Response Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-gray-700">Your Response:</h2>
                <button 
                  onClick={toggleMicrophone}
                  className={`p-2 rounded-full ${isMicActive ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
                >
                  {isMicActive ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>
              <div className="mb-4">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-3 h-32 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Type your response here..."
                  disabled={isThinking}
                ></textarea>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={endInterview}
                  className="btn btn-outline"
                >
                  End Interview
                </button>
                <button
                  onClick={submitResponse}
                  disabled={isThinking || !response.trim()}
                  className="btn btn-primary flex items-center"
                >
                  <Send size={18} className="mr-2" />
                  Submit Response
                </button>
              </div>
              
              {/* Show debug info in development */}
              {process.env.NODE_ENV === 'development' && debugInfo && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm text-gray-500">Debug Information</summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap bg-gray-100 p-2 rounded">
                    {debugInfo}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewSession; 