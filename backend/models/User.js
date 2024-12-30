const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  collegeName: {
    type: String,
    default: ''
  },
  branch: {
    type: String,
    default: ''
  },
  year: {
    type: String,
    default: ''
  },
  gender: {
    type: String,
    default: ''
  },
  course: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Check if profile is complete before saving
userSchema.pre('save', function(next) {
  const requiredFields = ['collegeName', 'branch', 'year', 'gender', 'course', 'location'];
  this.isProfileComplete = requiredFields.every(field => this[field] && this[field].toString().trim().length > 0);
  next();
});

module.exports = mongoose.model('User', userSchema);
