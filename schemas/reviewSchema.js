const mongoose = require('mongoose');

const reviewUserSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  bday: {
    type: String,
    required: true
  },
  pic: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  }, 
  published: {
    type: Boolean,
    default: true
  },
  review: {
    type: Boolean,
    default: false
  },
  todelete: {
    type: Boolean,
    default: false
  }
});

const ReviewUser = mongoose.model('reviewuser', reviewUserSchema);

module.exports = ReviewUser;
