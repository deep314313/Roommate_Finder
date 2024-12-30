const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const { upload, cloudinary } = require('../config/cloudinary');
const fs = require('fs');

// Get current user profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Upload profile photo
router.post('/upload-photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);
    
    // Update user's profile photo
    const user = await User.findById(req.user.id);
    user.profilePhoto = result.secure_url;
    await user.save();

    // Remove temporary file
    fs.unlinkSync(req.file.path);

    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading image' });
  }
});

// Search users
router.get('/search', auth, async (req, res) => {
  try {
    const { location, collegeName, year, branch, gender, course } = req.query;
    let query = {
      isProfileComplete: true,
      _id: { $ne: req.user.id }
    };

    // Only add conditions if the parameters are provided and not empty
    if (location && location.trim()) query.location = new RegExp(location, 'i');
    if (collegeName && collegeName.trim()) query.collegeName = new RegExp(collegeName, 'i');
    if (year && year.trim()) query.year = year;
    if (branch && branch.trim()) query.branch = new RegExp(branch, 'i');
    if (gender && gender.trim()) query.gender = gender;
    if (course && course.trim()) query.course = new RegExp(course, 'i');

    const users = await User.find(query)
      .select('-password')
      .limit(20);

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error searching users' });
  }
});

// Get user profile by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Update user profile
router.put('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    const updateFields = ['name', 'collegeName', 'branch', 'year', 'gender', 'course', 'location'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Save user which will trigger the pre-save middleware
    await user.save();

    // Return user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile' });
  }
});

module.exports = router;
