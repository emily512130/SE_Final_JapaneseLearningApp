const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  username: { type: String, required: true },
  lessonId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Lesson', 
    required: true 
  },
  score: { type: Number, required: true },
  status: { type: String, enum: ['completed', 'failed'], required: true }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Result', resultSchema);