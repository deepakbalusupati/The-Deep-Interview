import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Download, ThumbsUp, ThumbsDown } from 'react-feather';

function InterviewResults() {
  const { sessionId } = useParams();
  const { currentUser } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessionResults = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/interview/sessions/${sessionId}`);
        setSession(response.data.session);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching interview results:', err);
        setError('Failed to load interview results. Please try again later.');
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSessionResults();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 mb-6">
            {error}
          </div>
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-600 rounded-md p-4 mb-6">
            Interview session not found or still in progress.
          </div>
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/dashboard" className="inline-flex items-center text-primary-600 hover:text-primary-700">
            <ArrowLeft size={18} className="mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Results</h1>
        <p className="text-gray-600 mb-8">
          Review your performance and feedback for your {session.interviewType} interview for the {session.jobPosition} position.
        </p>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Overall Score</p>
              <p className="text-2xl font-bold text-primary-600">
                {session.feedback?.overallScore ? `${session.feedback.overallScore.toFixed(1)}/10` : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Questions</p>
              <p className="text-2xl font-bold text-gray-900">
                {session.questions?.length || 0}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {session.duration ? `${Math.floor(session.duration / 60)} min` : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Date</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Date(session.startTime).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Feedback</h2>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-gray-800">
              {session.feedback?.summary || 'No overall feedback available.'}
            </p>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Strengths</h3>
          <ul className="list-disc pl-5 mb-4">
            {session.feedback?.strengths?.map((strength, index) => (
              <li key={index} className="text-gray-800 mb-1">
                <span className="inline-flex items-center">
                  <ThumbsUp size={16} className="text-green-500 mr-2" />
                  {strength}
                </span>
              </li>
            )) || <li className="text-gray-600">No strengths identified.</li>}
          </ul>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Areas for Improvement</h3>
          <ul className="list-disc pl-5">
            {session.feedback?.improvements?.map((improvement, index) => (
              <li key={index} className="text-gray-800 mb-1">
                <span className="inline-flex items-center">
                  <ThumbsDown size={16} className="text-red-500 mr-2" />
                  {improvement}
                </span>
              </li>
            )) || <li className="text-gray-600">No areas for improvement identified.</li>}
          </ul>
        </div>

        <div className="flex justify-between">
          <Link to="/interview/setup" className="btn btn-primary">
            Start New Interview
          </Link>
          <button className="btn btn-outline flex items-center">
            <Download size={18} className="mr-2" />
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterviewResults; 