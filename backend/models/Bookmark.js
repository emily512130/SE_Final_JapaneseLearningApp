const mongoose = require('mongoose');

const BookmarkSchema = new mongoose.Schema({
  username: String,
  lessonId: String,
  q: String, 
  a: String, 
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bookmark', BookmarkSchema);