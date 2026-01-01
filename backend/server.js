const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Lesson = require('./models/Lesson');
const User = require('./models/User');
const Result = require('./models/Result');
const Activity = require('./models/Activity');
const Bookmark = require('./models/Bookmark');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Get MongoDB URI from environment variables
const uri = process.env.MONGODB_URI;

// Connect to MongoDB
mongoose.connect(uri)
  .then(async () => { 
    console.log("✅ Successfully connected to MongoDB Atlas!");

    try {
      const count = await Lesson.countDocuments();
      if (count === 0) {
        console.log("⚠️ Database is empty. Adding initial data...");
        await Lesson.create([
          { 
            title: "Hiragana Basic", 
            content: [
              { japanese: "あ", romaji: "a", english: "a", options: ["a", "i", "u"]},
              { japanese: "い", romaji: "i", english: "i", options: ["i", "u", "e"]},
              { japanese: "う", romaji: "u", english: "u", options: ["a", "u", "e"]}
            ] 
          },
          {
            title: "Daily Greetings",
            content: [
                { japanese: "Arigato", romaji: "Arigato", english: "Thank you", options: ["Thank you", "Hello", "Sorry"] },
                { japanese: "Sayonara", romaji: "Sayonara", english: "Goodbye", options: ["Goodbye", "Hello", "Sorry"] },
                { japanese: "Konichiwa", romaji: "Konichiwa", english: "Hello", options: ["Thank you", "Hello", "Sorry"] }
            ]
          },
          {
            title: "Numbers 1-5",
            content: [
                { japanese: "Ichi", romaji: "Ichi", english: "1", options: ["1", "4", "5"] },
                { japanese: "Ni", romaji: "Ni", english: "2", options: ["1", "2", "3",] },
                { japanese: "San", romaji: "San", english: "3", options: ["2", "3", "4"] },
                { japanese: "Shi", romaji: "Shi", english: "4" , options: ["1", "4", "5"]},
                { japanese: "Go", romaji: "Go", english: "5" , options: ["2", "4", "5"]}
            ]
          }
        ]);
        console.log("✅ Initial data seeded successfully!");
      }
    } catch (err) {
      console.log("❌ Error seeding data:", err.message);
    }
  })
  .catch(err => {
    console.log("❌ Connection failed! Please check your .env file.");
    console.log("Error Message:", err.message);
  });

// Base Route
app.get('/', (req, res) => {
  res.send("Japanese Learning App Backend is running!");
});

// Route to get all lessons from MongoDB
app.get('/api/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.find();
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Route to add a new lesson to MongoDB
app.post('/api/lessons', async (req, res) => {
  try {
    const newLesson = new Lesson(req.body);
    const savedLesson = await newLesson.save();
    res.status(201).json(savedLesson);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    console.log(`Received update request, lesson ID: ${id}`);

    const updatedLesson = await Lesson.findByIdAndUpdate(
      id,
      { title, content },
      { new: true, runValidators: true } 
    );

    if (!updatedLesson) {
      console.log("❌ Lesson not found");
      return res.status(404).json({ message: "Lesson not found" });
    }

    console.log(`✅ Lesson updated successfully: ${updatedLesson.title}`);
    res.json(updatedLesson); 
  } catch (err) {
    console.error("❌ Failed to update:", err.message);
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedLesson = await Lesson.findByIdAndDelete(id);
    
    if (!deletedLesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const deleteResultInfo = await Result.deleteMany({ lessonId: id });
    
    console.log(`✅ Deleted Lesson: ${id} and ${deleteResultInfo.deletedCount} related results.`);
    
    res.json({ 
      message: "Lesson and associated results deleted successfully",
      deletedResultsCount: deleteResultInfo.deletedCount 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find(); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, role } = req.body;
  try {
    let user = await User.findOne({ username });
    let isNewUser = false;
    if (!user) {
      user = new User({ username, role });
      await user.save();
      isNewUser = true;
      console.log(`✅ New user created in DB: ${username}`);
    }
    // Login Record
    const loginActivity = new Activity({
      username: username,
      action: isNewUser ? 'registered' : 'login',
      lessonTitle: isNewUser ? 'New Member Joined' : 'Accessing App'
    });
    await loginActivity.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add quiz result
app.post('/api/results', async (req, res) => {
  try {

    const { username, lessonTitle, status } = req.body;
    // Save activity log
    const newResult = new Result(req.body);
    const savedResult = await newResult.save();
    
    // Log activity
    const newActivity = new Activity({
      username: username,
      action: status === 'completed' ? 'completed' : 'attempted',
      lessonTitle: lessonTitle || "a lesson"
    });
    await newActivity.save();

    res.status(201).json(savedResult);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get recent activities
app.get('/api/activities', async (req, res) => {
  try {
    // Sort by timestamp descending (-1), limit to 10 most recent
    const activities = await Activity.find().sort({ timestamp: -1 }).limit(10);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all quiz results
app.get('/api/results', async (req, res) => {
  try {
    const results = await Result.find();
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get specific student's results
app.get('/api/results/student/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const results = await Result.find({ username })
      .populate('lessonId', 'title') 
      .sort({ createdAt: -1 }); 

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "No records found for this student." });
    }

    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching student details:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Delete all records of a specific student
app.delete('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Delete all quiz results associated with the username
    await Result.deleteMany({ username });

    // Delete all bookmarks associated with the username
    await Bookmark.deleteMany({ username });
    
    const deleteAccount = await User.deleteOne({ username });
    
    if (deleteAccount.deletedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      message: `All records of user ${username} have been successfully deleted.`, 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed", error: error.message });
  }
});

// Clear all the data
app.post('/api/system/reset', async (req, res) => {
  try {
    await User.deleteMany({ username: { $ne: 'admin' } }); 
    await Result.deleteMany({});      
    await Bookmark.deleteMany({});   
    await Activity.deleteMany({});    
    
    res.json({ message: "System has been fully reset. Admin account preserved." });
  } catch (error) {
    res.status(500).json({ message: "Reset failed", error: error.message });
  }
});

// Toggle bookmark
app.post('/api/bookmarks/toggle', async (req, res) => {
  try {
    const { username, lessonId, q, a } = req.body;
    // Check if bookmark exists
    const existing = await Bookmark.findOne({ username, q });

    if (existing) {
      await Bookmark.deleteOne({ _id: existing._id });
      res.json({ action: "removed" });
    } else {
      const newBookmark = new Bookmark({ username, lessonId, q, a });
      await newBookmark.save();

      // Bookmark Record
      const bookmarkActivity = new Activity({
        username: username,
        action: 'bookmarked',
        lessonTitle: q 
      });
      await bookmarkActivity.save();
      res.json({ action: "added" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bookmarks for a user
app.get('/api/bookmarks/:username', async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ username: req.params.username })
                                   .sort({ _id: -1 }); // 💡 新增這行：最新收藏排前面
    res.json(bookmarks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on: http://localhost:${PORT}`);
});