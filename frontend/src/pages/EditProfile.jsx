import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const libraries = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem'
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  
  const [location, setLocation] = useState({
    lat: defaultCenter.lat,
    lng: defaultCenter.lng,
    address: ''
  });

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    photo: '',
    collegeName: '',
    branch: '',
    year: '',
    gender: '',
    course: '',
    pgName: '',
    hasAirConditioning: false,
    foodAvailable: false,
    roomType: 'double',
  });

  const onMapClick = useCallback(async (e) => {
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();
    
    setLocation(prev => ({
      ...prev,
      lat: newLat,
      lng: newLng
    }));

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLat},${newLng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.results && response.data.results[0]) {
        setLocation(prev => ({
          ...prev,
          address: response.data.results[0].formatted_address
        }));
      }
    } catch (error) {
      console.error('Error getting address:', error);
    }
  }, []);

  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.results && response.data.results[0]) {
        setLocation(prev => ({
          ...prev,
          address: response.data.results[0].formatted_address
        }));
      }
    } catch (error) {
      console.error('Error getting address:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const userData = response.data;
        
        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          photo: userData.profilePhoto || '',
          collegeName: userData.collegeName || '',
          branch: userData.branch || '',
          year: userData.year || '',
          gender: userData.gender || '',
          course: userData.course || '',
          pgName: userData.pgName || '',
          hasAirConditioning: userData.hasAirConditioning || false,
          foodAvailable: userData.foodAvailable || false,
          roomType: userData.roomType || 'double',
        });

        if (userData.profilePhoto) {
          setPreviewImage(userData.profilePhoto);
        }
        if (userData.location?.coordinates) {
          setLocation({
            lat: userData.location.coordinates[1],
            lng: userData.location.coordinates[0],
            address: userData.location.address || ''
          });
        }
      } catch (err) {
        setError('Failed to load profile');
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG or PNG)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('photo', file);

      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const response = await axios.post(
        `${API_URL}/api/profile/upload-photo`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setPreviewImage(URL.createObjectURL(file));
      setProfile(prev => ({ ...prev, photo: response.data.url }));
      setSuccess('Photo uploaded successfully');
    } catch (err) {
      setError('Failed to upload image: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSearch = async () => {
    if (!searchQuery) return;

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          searchQuery
        )}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        const { lat, lng } = result.geometry.location;
        setLocation({
          lat,
          lng,
          address: result.formatted_address
        });
      }
    } catch (error) {
      setError('Error searching location');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      // Update basic profile
      await axios.put(`${API_URL}/api/profile`, {
        name: profile.name,
        photo: profile.photo,
        collegeName: profile.collegeName,
        branch: profile.branch,
        year: profile.year,
        gender: profile.gender,
        course: profile.course,
      }, config);

      // Update PG details
      await axios.put(`${API_URL}/api/profile/update-pg-details`, {
        pgName: profile.pgName,
        hasAirConditioning: profile.hasAirConditioning,
        foodAvailable: profile.foodAvailable,
        roomType: profile.roomType,
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat],
          address: location.address
        }
      }, config);

      setSuccess('Profile updated successfully');
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {success && <div className="text-green-500 mb-4">{success}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Profile Photo Upload */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <img
                  src={previewImage || '/default-avatar.png'}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-black bg-opacity-75 text-white p-2 rounded-full cursor-pointer hover:bg-opacity-90">
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageUpload}
                className="hidden"
                disabled={loading}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </label>
          </div>
          <p className="text-sm text-gray-500">Click to upload profile photo (Max 5MB)</p>
        </div>

        {/* Basic Profile Fields */}
        <div className="space-y-4">
          <div>
            <label className="block mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={profile.email || ''}
              className="w-full p-2 border rounded bg-gray-50"
              disabled
              readOnly
            />
          </div>

          <div>
            <label className="block mb-1">College Name</label>
            <input
              type="text"
              name="collegeName"
              value={profile.collegeName}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1">Branch</label>
            <input
              type="text"
              name="branch"
              value={profile.branch}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1">Year</label>
            <select
              name="year"
              value={profile.year}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Year</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Gender</label>
            <select
              name="gender"
              value={profile.gender}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Course</label>
            <input
              type="text"
              name="course"
              value={profile.course}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>

        {/* PG Details */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">PG Details</h3>
          
          <div>
            <label className="block mb-1">PG Name</label>
            <input
              type="text"
              name="pgName"
              value={profile.pgName}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="hasAirConditioning"
                checked={profile.hasAirConditioning}
                onChange={handleChange}
                className="mr-2"
              />
              Air Conditioning Available
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="foodAvailable"
                checked={profile.foodAvailable}
                onChange={handleChange}
                className="mr-2"
              />
              Food Available
            </label>
          </div>

          <div>
            <label className="block mb-1">Room Type</label>
            <select
              name="roomType"
              value={profile.roomType}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="double">Double Sharing</option>
              <option value="triple">Triple Sharing</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block">Location</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a location"
                className="flex-1 p-2 border rounded"
              />
              <button
                type="button"
                onClick={handleLocationSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Search
              </button>
            </div>
            
            <LoadScript
              googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              libraries={libraries}
            >
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={{ lat: location.lat, lng: location.lng }}
                zoom={15}
                onClick={onMapClick}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false
                }}
              >
                {location.lat && location.lng && (
                  <Marker
                    position={{ lat: location.lat, lng: location.lng }}
                    icon={{
                      url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                    }}
                  />
                )}
              </GoogleMap>
            </LoadScript>
            
            {location.address && (
              <p className="text-sm mt-2">
                Selected Address: {location.address}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default EditProfile;
