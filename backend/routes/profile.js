import { Router } from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import { upload, cloudinary } from '../config/cloudinary.js';
import { promises as fs } from 'fs';

const router = Router();

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

    // Check if cloudinary is properly configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary configuration is missing');
    }

    // Upload to Cloudinary with error handling
    let result;
    try {
      result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'roommate-finder',
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error:', cloudinaryError);
      throw new Error('Failed to upload image to cloud storage');
    }

    // Update user's profile photo
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { profilePhoto: result.secure_url } },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new Error('User not found');
    }

    // Delete the temporary file
    if (req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temporary file:', err);
      });
    }

    res.json(user);
  } catch (err) {
    console.error('Profile photo upload error:', err);
    
    // Clean up temporary file if it exists
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting temporary file:', unlinkErr);
      });
    }

    res.status(500).json({ 
      message: 'Error uploading photo',
      error: err.message 
    });
  }
});

// Search profiles
router.get('/search', auth, async (req, res) => {
  try {
    const { location, collegeName, year, branch, gender, course, pgName } = req.query;
    const query = { _id: { $ne: req.user.id } };

    if (location) {
      query['location.address'] = { $regex: location, $options: 'i' };
    }
    if (collegeName) {
      query.collegeName = { $regex: collegeName, $options: 'i' };
    }
    if (year) {
      query.year = year;
    }
    if (branch) {
      query.branch = { $regex: branch, $options: 'i' };
    }
    if (gender) {
      query.gender = gender;
    }
    if (course) {
      query.course = { $regex: course, $options: 'i' };
    }
    if (pgName) {
      query.pgName = { $regex: pgName, $options: 'i' };
    }

    const profiles = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(profiles);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
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

// Update PG details and location
router.put('/update-pg-details', auth, async (req, res) => {
  try {
    const {
      pgName,
      hasAirConditioning,
      foodAvailable,
      roomType,
      location
    } = req.body;

    const updateFields = {
      pgName,
      hasAirConditioning,
      foodAvailable,
      roomType,
      location
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error updating PG details' });
  }
});

// Search PGs by location
router.get('/search-pg', async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 5000 } = req.query; // maxDistance in meters

    const pgs = await User.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).select('-password');

    res.json(pgs);
  } catch (err) {
    res.status(500).json({ message: 'Error searching PGs' });
  }
});

export default router;
