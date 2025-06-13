import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { AlertCircle, User, Mail, Key, Save } from 'react-feather';

const Profile = () => {
  const { currentUser, updateUser, logout } = useAuth();
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editMode, setEditMode] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  useEffect(() => {
    if (currentUser) {
      setProfileData({
        ...profileData,
        name: currentUser.name,
        email: currentUser.email,
      });
    }
  }, [currentUser]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value,
    });
  };
  
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    // Reset message
    setMessage({ type: '', text: '' });
    
    try {
      setLoading(true);
      
      // Prepare data for update
      const updateData = {
        name: profileData.name,
      };
      
      // Add password data if changing password
      if (isChangingPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) {
          setMessage({
            type: 'error',
            text: 'New passwords do not match',
          });
          setLoading(false);
          return;
        }
        
        if (profileData.newPassword.length < 6) {
          setMessage({
            type: 'error',
            text: 'New password must be at least 6 characters',
          });
          setLoading(false);
          return;
        }
        
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }
      
      // Send update request
      const res = await axios.patch('/api/user/profile', updateData);
      
      if (res.data.success) {
        // Update user in context
        updateUser({
          ...currentUser,
          name: profileData.name,
        });
        
        setMessage({
          type: 'success',
          text: 'Profile updated successfully',
        });
        
        // Reset password fields
        setProfileData({
          ...profileData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        
        setIsChangingPassword(false);
        setEditMode(false);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        setLoading(true);
        
        const res = await axios.delete('/api/user/profile');
        
        if (res.data.success) {
          logout();
          // Redirect will happen via the Auth context
        }
      } catch (err) {
        console.error('Error deleting account:', err);
        
        setMessage({
          type: 'error',
          text: err.response?.data?.message || 'Failed to delete account',
        });
        setLoading(false);
      }
    }
  };
  
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600">Loading profile...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-600 mb-8">
          Manage your account information and password
        </p>
        
        {message.text && (
          <div 
            className={`${
              message.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600'
            } border rounded-md p-4 mb-6`}
          >
            <div className="flex">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{message.text}</span>
            </div>
          </div>
        )}
        
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <form onSubmit={handleProfileUpdate}>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Personal Information
              </h2>
              
              <div className="mb-4">
                <label 
                  htmlFor="name" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={profileData.name}
                    onChange={handleChange}
                    disabled={!editMode || loading}
                    className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md ${
                      !editMode ? 'bg-gray-50' : 'bg-white'
                    } focus:ring-primary-500 focus:border-primary-500`}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    disabled={true}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Email cannot be changed
                </p>
              </div>
            </div>
            
            {/* Password Section */}
            {editMode && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Password
                  </h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsChangingPassword(!isChangingPassword)}
                    disabled={loading}
                  >
                    {isChangingPassword ? 'Cancel' : 'Change Password'}
                  </Button>
                </div>
                
                {isChangingPassword && (
                  <>
                    <div className="mb-4">
                      <label 
                        htmlFor="currentPassword" 
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Current Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          id="currentPassword"
                          name="currentPassword"
                          value={profileData.currentPassword}
                          onChange={handleChange}
                          disabled={loading}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          required={isChangingPassword}
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label 
                        htmlFor="newPassword" 
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          id="newPassword"
                          name="newPassword"
                          value={profileData.newPassword}
                          onChange={handleChange}
                          disabled={loading}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          required={isChangingPassword}
                          minLength={6}
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label 
                        htmlFor="confirmPassword" 
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={profileData.confirmPassword}
                          onChange={handleChange}
                          disabled={loading}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          required={isChangingPassword}
                          minLength={6}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            
            <div className="flex justify-between">
              {!editMode ? (
                <Button
                  type="button"
                  onClick={() => setEditMode(true)}
                  disabled={loading}
                >
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      setIsChangingPassword(false);
                      // Reset form
                      setProfileData({
                        ...profileData,
                        name: currentUser.name,
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {editMode && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={loading}
                >
                  Delete Account
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile; 