const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  username: String,
  action: String,       
  lessonTitle: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', ActivitySchema);