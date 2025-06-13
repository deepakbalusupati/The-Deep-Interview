import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { AlertCircle, Upload, File, Trash2, Edit, FileText } from 'react-feather';
import { useAuth } from '../context/AuthContext';

const ResumeManager = () => {
  const { currentUser } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [resumeTitle, setResumeTitle] = useState('');
  const [editingResumeId, setEditingResumeId] = useState(null);
  const [activeResumeId, setActiveResumeId] = useState(null);

  // Fetch user's resumes
  useEffect(() => {
    const fetchResumes = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/resume');
        
        if (res.data.success) {
          setResumes(res.data.resumes);
          
          // Set active resume if exists
          const activeResume = res.data.resumes.find(r => r.isActive);
          if (activeResume) {
            setActiveResumeId(activeResume._id);
          }
        }
      } catch (err) {
        console.error('Error fetching resumes:', err);
        setError('Failed to load resumes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, []);

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
    
    try {
      setUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('resume', selectedFile);
      formData.append('title', resumeTitle);
      formData.append('userId', currentUser._id);
      
      const res = await axios.post('/api/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
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
        
        const res = await axios.delete(`/api/resume/${resumeId}`);
        
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
    
    const newTitle = window.prompt('Enter a new title for your resume', resume.title);
    
    if (newTitle && newTitle.trim() !== '' && newTitle !== resume.title) {
      try {
        setLoading(true);
        
        const res = await axios.patch(`/api/resume/${resumeId}`, {
          title: newTitle
        });
        
        if (res.data.success) {
          setResumes(resumes.map(r => r._id === resumeId ? { ...r, title: newTitle } : r));
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
      
      const res = await axios.post(`/api/resume/${resumeId}/set-active`);
      
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
              <div className="mt-1 flex items-center">
                <label 
                  className="cursor-pointer w-full flex justify-center py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  <span className="mr-2">
                    <Upload className="h-5 w-5" />
                  </span>
                  <span>Select File</span>
                  <input
                    type="file"
                    id="resume-upload"
                    onChange={handleFileChange}
                    accept=".pdf"
                    className="sr-only"
                  />
                </label>
              </div>
              {selectedFile && (
                <div className="mt-2 text-sm text-gray-500 flex items-center">
                  <File className="h-4 w-4 mr-1" />
                  <span>{selectedFile.name}</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={uploading || !selectedFile}
              >
                {uploading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Resume
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
        
        {/* Resumes List */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Your Resumes
            </h2>
          </div>
          
          {loading ? (
            <div className="p-6 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : resumes.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>You haven't uploaded any resumes yet.</p>
              <p className="mt-2 text-sm">Upload a resume to get personalized interview questions.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {resumes.map((resume) => (
                <li key={resume._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className={`rounded-md p-2 ${resume._id === activeResumeId ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
                          <FileText className="h-6 w-6" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {resume.title}
                          {resume._id === activeResumeId && (
                            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-600">
                              Active
                            </span>
                          )}
                        </h3>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span>Uploaded: {formatDate(resume.createdAt)}</span>
                          {resume.updatedAt !== resume.createdAt && (
                            <span className="ml-4">
                              Updated: {formatDate(resume.updatedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {resume._id !== activeResumeId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetActive(resume._id)}
                          disabled={loading}
                        >
                          Set as Active
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditTitle(resume._id)}
                        disabled={loading}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(resume._id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeManager; 