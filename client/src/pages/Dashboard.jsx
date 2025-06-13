import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BarChart2, Calendar, Clock, FileText, PlusCircle, User } from 'react-feather';

function Dashboard() {
  const { currentUser } = useAuth();
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [stats, setStats] = useState({
    totalInterviews: 0,
    totalQuestions: 0,
    averageScore: 0,
    averageDurationMinutes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch interview history
        const historyResponse = await axios.get(`/api/user/history?userId=${currentUser._id}`);
        setInterviewHistory(historyResponse.data.interviewSessions.slice(0, 5)); // Get latest 5 sessions
        
        // Fetch user statistics
        const statsResponse = await axios.get(`/api/user/statistics?userId=${currentUser._id}`);
        setStats(statsResponse.data.statistics);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };

    if (currentUser?._id) {
      fetchDashboardData();
    }
  }, [currentUser]);

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {currentUser?.name}!</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link
            to="/interview/setup"
            className="btn btn-primary flex items-center"
          >
            <PlusCircle size={18} className="mr-2" />
            New Interview
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="bg-primary-100 p-3 rounded-full">
                  <Calendar className="text-primary-600" size={20} />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-700">Total Interviews</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalInterviews}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="bg-primary-100 p-3 rounded-full">
                  <FileText className="text-primary-600" size={20} />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-700">Total Questions</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalQuestions}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="bg-primary-100 p-3 rounded-full">
                  <BarChart2 className="text-primary-600" size={20} />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-700">Average Score</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {stats.averageScore ? stats.averageScore.toFixed(1) : 'N/A'}
                {stats.averageScore ? <span className="text-sm text-gray-500">/10</span> : ''}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="bg-primary-100 p-3 rounded-full">
                  <Clock className="text-primary-600" size={20} />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-700">Avg Duration</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {stats.averageDurationMinutes || 'N/A'}
                {stats.averageDurationMinutes ? <span className="text-sm text-gray-500"> min</span> : ''}
              </p>
            </div>
          </div>

          {/* Recent Interviews */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Interviews</h2>
            
            {interviewHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">You haven't completed any interviews yet.</p>
                <Link to="/interview/setup" className="btn btn-primary">
                  Start Your First Interview
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {interviewHistory.map((interview) => (
                      <tr key={interview._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(interview.startTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {interview.jobPosition}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {interview.interviewType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {interview.feedback?.overallScore 
                            ? `${interview.feedback.overallScore.toFixed(1)}/10` 
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${interview.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              interview.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-800'}`}>
                            {interview.status === 'in-progress' ? 'In Progress' : 
                             interview.status === 'completed' ? 'Completed' : 'Abandoned'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {interview.status === 'completed' ? (
                            <Link 
                              to={`/interview/results/${interview.sessionId}`}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              View Results
                            </Link>
                          ) : interview.status === 'in-progress' ? (
                            <Link 
                              to={`/interview/session/${interview.sessionId}`}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              Continue
                            </Link>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {interviewHistory.length > 0 && (
              <div className="mt-4 text-right">
                <Link to="/dashboard/history" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                  View All Interviews
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <User className="text-primary-600" size={24} />
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Profile</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Update your professional details and preferences.
              </p>
              <Link to="/profile" className="btn btn-outline w-full">
                Manage Profile
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <FileText className="text-primary-600" size={24} />
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Resumes</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Upload and manage your resumes for personalized interviews.
              </p>
              <Link to="/resume" className="btn btn-outline w-full">
                Manage Resumes
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <BarChart2 className="text-primary-600" size={24} />
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Statistics</h3>
              </div>
              <p className="text-gray-600 mb-4">
                View detailed analytics about your interview performance.
              </p>
              <Link to="/dashboard/statistics" className="btn btn-outline w-full">
                View Statistics
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard; 