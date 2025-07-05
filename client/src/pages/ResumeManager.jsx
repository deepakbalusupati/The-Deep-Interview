import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, FileText, Edit2, Trash2, Star } from 'react-feather';
import api from '../utils/api';

const ResumeManager = () => {
  const { currentUser } = useAuth();
  
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [resumeTitle, setResumeTitle] = useState('');
  // These variables are reserved for future functionality
  // eslint-disable-next-line no-unused-vars
  const [editingResumeId, setEditingResumeId] = useState(null);
  const [activeResumeId, setActiveResumeId] = useState(null);

  // Fetch user's resumes
  useEffect(() => {
    const fetchResumes = async () => {
      try {
        setLoading(true);
        // Only attempt to fetch if user is logged in
        if (currentUser && currentUser._id) {
          const res = await api.get('/api/resume');
          
          if (res.data.success) {
            setResumes(res.data.resumes);
            
            // Set active resume if exists
            const activeResume = res.data.resumes.find(r => r.isActive);
            if (activeResume) {
              setActiveResumeId(activeResume._id);
            }
          }
        } else {
          // User not logged in or no user ID
          setError('Please log in to manage resumes');
        }
      } catch (err) {
        console.error('Error fetching resumes:', err);
        setError('Failed to load resumes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [currentUser]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are accepted');
        setSelectedFile(null);
        e.target.value = null;
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit');
        setSelectedFile(null);
        e.target.value = null;
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      
      // Set default title from filename
      if (!resumeTitle) {
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setResumeTitle(fileName);
      }
    }
  };

  // Handle resume upload
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }
    
    if (!resumeTitle.trim()) {
      setError('Please provide a title for your resume');
      return;
    }
    
    // Check if user is logged in
    if (!currentUser || !currentUser._id) {
      setError('You must be logged in to upload a resume');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('resume', selectedFile);
      formData.append('title', resumeTitle);
      
      const res = await api.post('/api/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // Increase timeout for large files
      });
      
      if (res.data.success) {
        setMessage('Resume uploaded successfully');
        setResumes([...resumes, res.data.resume]);
        setSelectedFile(null);
        setResumeTitle('');
        
        // Reset file input
        document.getElementById('resume-upload').value = '';
      }
    } catch (err) {
      console.error('Error uploading resume:', err);
      setError(err.response?.data?.message || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  // Handle resume deletion
  const handleDelete = async (resumeId) => {
    if (window.confirm('Are you sure you want to delete this resume?')) {
      try {
        setLoading(true);
        
        const res = await api.delete(`/api/resume/${resumeId}`);
        
        if (res.data.success) {
          setResumes(resumes.filter(resume => resume._id !== resumeId));
          setMessage('Resume deleted successfully');
          
          // If we deleted the active resume, clear the active resume ID
          if (resumeId === activeResumeId) {
            setActiveResumeId(null);
          }
        }
      } catch (err) {
        console.error('Error deleting resume:', err);
        setError('Failed to delete resume');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle editing resume title
  const handleEditTitle = async (resumeId) => {
    const resume = resumes.find(r => r._id === resumeId);
    if (!resume) return;
    
    const newTitle = window.prompt('Enter a new title for your resume', resume.name || resume.title);
    
    if (newTitle && newTitle.trim() !== '' && newTitle !== (resume.name || resume.title)) {
      try {
        setLoading(true);
        
        const res = await api.patch(`/api/resume/${resumeId}`, {
          title: newTitle
        });
        
        if (res.data.success) {
          setResumes(resumes.map(r => r._id === resumeId ? { ...r, name: newTitle, title: newTitle } : r));
          setMessage('Resume title updated successfully');
        }
      } catch (err) {
        console.error('Error updating resume title:', err);
        setError('Failed to update resume title');
      } finally {
        setLoading(false);
      }
    }
  };

  // Set resume as active
  const handleSetActive = async (resumeId) => {
    try {
      setLoading(true);
      
      const res = await api.post(`/api/resume/${resumeId}/set-active`);
      
      if (res.data.success) {
        // Update local state
        setResumes(resumes.map(r => ({
          ...r,
          isActive: r._id === resumeId
        })));
        
        setActiveResumeId(resumeId);
        setMessage('Active resume updated successfully');
      }
    } catch (err) {
      console.error('Error setting active resume:', err);
      setError('Failed to set active resume');
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Manager</h1>
        <p className="text-gray-600 mb-8">
          Upload and manage your resumes for tailored interview experiences
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 mb-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-600 rounded-md p-4 mb-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{message}</span>
            </div>
          </div>
        )}
        
        {/* Upload Form */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Upload New Resume
          </h2>
          
          <form onSubmit={handleUpload}>
            <div className="mb-4">
              <label 
                htmlFor="resume-title" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Resume Title
              </label>
              <input
                type="text"
                id="resume-title"
                value={resumeTitle}
                onChange={(e) => setResumeTitle(e.target.value)}
                placeholder="e.g., Software Engineer Resume"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div className="mb-6">
              <label 
                htmlFor="resume-upload"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Resume File (PDF only, max 5MB)
              </label>
              <input
                type="file"
                id="resume-upload"
                accept=".pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100"
                required
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-500">
                  Selected file: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </p>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    Upload Resume
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Resumes List */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Your Resumes
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : resumes.length > 0 ? (
            <div className="space-y-4">
              {resumes.map((resume) => (
                <div 
                  key={resume._id}
                  className={`border rounded-lg p-4 ${
                    resume.isActive ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <div className="bg-gray-100 rounded-lg p-2">
                        <FileText className="text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {resume.name || resume.title}
                          {resume.isDefault && (
                            <span className="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Uploaded on {formatDate(resume.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSetActive(resume._id)}
                        className={`p-1.5 rounded-md ${
                          resume.isActive
                            ? 'text-primary-600 bg-primary-100'
                            : 'text-gray-400 hover:text-primary-600 hover:bg-gray-100'
                        }`}
                        title="Set as active"
                      >
                        <Star size={16} />
                      </button>
                      <button
                        onClick={() => handleEditTitle(resume._id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-gray-100"
                        title="Edit title"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(resume._id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-gray-100"
                        title="Delete resume"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <FileText className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-600 mb-2">You haven't uploaded any resumes yet.</p>
              <p className="text-gray-500 text-sm">
                Upload a resume to get personalized interview questions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeManager;