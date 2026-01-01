const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  content: [
    {
      japanese: { type: String, required: true },
      romaji: { type: String },
      english: { type: String, required: true },
      options: { type: [String], default: [] }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lesson', LessonSchema);