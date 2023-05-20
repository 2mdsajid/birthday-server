const mongoose = require('mongoose');

const VivaSchema = new mongoose.Schema({
  author: {
    type: String,
    default:''
  },
  content: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  level: {
    type: String,
    default: 'first'
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const vivaSchema = mongoose.model('VIVA', VivaSchema);

module.exports = vivaSchema;
