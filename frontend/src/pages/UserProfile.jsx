import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const libraries = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem'
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const onMapLoad = () => {
    setMapLoaded(true);
  };

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
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        const response = await axios.get(`${API_URL}/api/profile/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUser(response.data);

        // If user found and not viewing own profile, get or create conversation
        if (response.data && response.data._id !== currentUser?._id) {
          // Use find-or-create endpoint
          const convResponse = await axios.post(
            `${API_URL}/api/conversations/find-or-create`,
            { receiverId: userId },
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          
          setConversation(convResponse.data);
          
          // Get messages for the conversation
          const messagesResponse = await axios.get(
            `${API_URL}/api/messages/${convResponse.data._id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          setMessages(messagesResponse.data);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
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
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      // Send message
      const response = await axios.post(
        `${API_URL}/api/messages`,
        {
          conversationId: conversation._id,
          text: message.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Add the new message to messages
      setMessages(prevMessages => [...prevMessages, response.data]);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const handleMapClick = () => {
    if (user.location?.coordinates) {
      const [lng, lat] = user.location.coordinates;
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
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
            {user && (
              <div className="space-y-6">
                {/* Education Details */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Education Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600"><span className="font-medium">College:</span> {user.collegeName}</p>
                      <p className="text-gray-600"><span className="font-medium">Course:</span> {user.course}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><span className="font-medium">Branch:</span> {user.branch}</p>
                      <p className="text-gray-600"><span className="font-medium">Year:</span> {user.year}</p>
                    </div>
                  </div>
                </div>

                {/* Personal Details */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Personal Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600"><span className="font-medium">Name:</span> {user.name}</p>
                      <p className="text-gray-600"><span className="font-medium">Gender:</span> {user.gender}</p>
                    </div>
                    {user.location?.coordinates && (
                      <div className="md:col-span-2 mt-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-lg font-semibold text-gray-900">PG Location</h4>
                          <button
                            onClick={handleMapClick}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            Open in Maps
                          </button>
                        </div>
                        <div className="w-full h-[300px] rounded-lg overflow-hidden">
                          <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                            <GoogleMap
                              mapContainerStyle={mapContainerStyle}
                              center={{
                                lat: user.location.coordinates[1],
                                lng: user.location.coordinates[0]
                              }}
                              zoom={15}
                              options={{
                                streetViewControl: false,
                                mapTypeControl: false,
                                fullscreenControl: false
                              }}
                            >
                              <Marker
                                position={{
                                  lat: user.location.coordinates[1],
                                  lng: user.location.coordinates[0]
                                }}
                                icon={{
                                  url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                                }}
                              />
                            </GoogleMap>
                          </LoadScript>
                        </div>
                        {user.location.address && (
                          <p className="text-sm text-gray-600 mt-2">
                            {user.location.address}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* PG Details */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">PG Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600"><span className="font-medium">PG Name:</span> {user.pgName}</p>
                      <p className="text-gray-600">
                        <span className="font-medium">Air Conditioning:</span> {user.hasAirConditioning ? 'Yes' : 'No'}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Food Available:</span> {user.foodAvailable ? 'Yes' : 'No'}
                      </p>
                      <p className="text-gray-600"><span className="font-medium">Room Type:</span> {user.roomType}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Chat Section */}
        <div className="bg-white rounded-lg shadow-md flex flex-col h-[calc(100vh-8rem)]">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold">Chat with {user.name}</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={msg._id || index}
                    className={`flex ${msg.sender === currentUser._id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[70%] ${
                        msg.sender === currentUser._id
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="break-words">{msg.text}</p>
                      <span className="text-xs opacity-70 block mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">No messages yet. Start a conversation!</p>
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
