const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // Ensures emails are unique
  },
  status: {
    type: Boolean,
    default: 'false', // Default status is 'unsubscribed'
  },
});

const Email = mongoose.model('Email', emailSchema);

module.exports = Email;
