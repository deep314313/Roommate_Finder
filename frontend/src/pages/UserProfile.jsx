import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if trying to view own profile
        if (userId === currentUser?._id) {
          navigate('/profile');
          return;
        }

        // Fetch user profile
        const token = localStorage.getItem('token');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/profile/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUser(response.data);

        // If user found and not viewing own profile, fetch or create conversation
        if (response.data && response.data._id !== currentUser?._id) {
          const convResponse = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/conversations/find-or-create`,
            { receiverId: userId },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          setConversation(convResponse.data);

          // Fetch messages for the conversation
          const messagesResponse = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/messages/${convResponse.data._id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          setMessages(messagesResponse.data);
        }
      } catch (error) {
        setError('Failed to load profile information');
      } finally {
        setLoading(false);
      }
    };

    if (userId && currentUser) {
      loadProfile();
    }
  }, [userId, currentUser, navigate]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !conversation?._id) return;

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/messages`,
        {
          conversationId: conversation._id,
          text: message.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setMessages([...messages, response.data]);
      setMessage('');
    } catch (error) {
      setError('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
          User not found
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[calc(100vh-8rem)]">
        {/* Left Side - User Profile */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col items-center space-y-4 mb-8">
            <img
              src={user.profilePhoto || '/default-avatar.png'}
              alt={user.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
            />
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Education</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">College</p>
                  <p className="mt-1">{user.collegeName || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Course</p>
                  <p className="mt-1">{user.course || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Branch</p>
                  <p className="mt-1">{user.branch || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Year</p>
                  <p className="mt-1">{user.year || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Personal Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Gender</p>
                  <p className="mt-1">{user.gender || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="mt-1">{user.location || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Chat Section */}
        <div className="bg-white rounded-lg shadow-md flex flex-col h-[calc(100vh-8rem)]">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold">Chat with {user.name}</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${
                    msg.sender === currentUser?._id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      msg.sender === currentUser?._id
                        ? 'bg-black text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    <p className="break-words">{msg.text}</p>
                    <span className="text-xs opacity-70 block mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
