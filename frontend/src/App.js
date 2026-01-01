import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [role, setRole] = useState('student');
  const [loginInput, setLoginInput] = useState("");
  const [lessons, setLessons] = useState([]);
  const [view, setView] = useState('home');
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [bookmarks, setBookmarks] = useState({});
  const [activities, setActivities] = useState([]);
  const [completedLessons, setCompletedLessons] = useState({});
  const [failedLessons, setFailedLessons] = useState({});
  const [userRoles, setUserRoles] = useState({});
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [quizData, setQuizData] = useState({});
  const [editingLesson, setEditingLesson] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [tempQuestions, setTempQuestions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [allResults, setAllResults] = useState([]);

  const userFailed = (user && failedLessons) ? (failedLessons[user] || []) : [];

  // Add new lesson (for admin)
  const handleAddLesson = async () => {
    if (!newLessonTitle.trim()) return;

    const newLessonData = { 
      title: newLessonTitle.trim(),
      content: [] 
    };

    try {
      const response = await fetch('http://localhost:5000/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLessonData)
      });

      if (!response.ok) throw new Error('Failed to save the lesson');

      const savedLesson = await response.json();

      setLessons([...lessons, savedLesson]);
      setNewLessonTitle("");
      alert("✅ Lesson successfully published to the Cloud Database!");

    } catch (error) {
      console.error("❌ Error adding lesson:", error);
      alert("Failed to add lesson. Please ensure the backend server is running.");
    }
  };

  // Function to save updated lesson content to MongoDB
  const handleSaveContent = async () => {
    const current = editingQuiz || editingLesson;
    
    if (!current) {
      alert("No lesson selected!");
      return;
    }

    const targetId = current._id

    const formattedContent = tempQuestions.map(q => {
      let finalOptions = [];
      if (Array.isArray(q.options)) {
        finalOptions = q.options;
      } else if (typeof q.options === 'string') {
        finalOptions = q.options.split(',').map(opt => opt.trim()).filter(opt => opt !== "");
      }

      return {
        japanese: q.q, 
        romaji: q.romaji || "",
        english: q.a,
        options: finalOptions
      };
    });

    console.log("🚀 Sending request to:", `http://localhost:5000/api/lessons/${targetId}`);

    try {
      const response = await fetch(`http://localhost:5000/api/lessons/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: editingQuiz.title,
          content: formattedContent
        }) 
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const updatedLesson = await response.json();
      
      setLessons(prev => prev.map(l => l._id === targetId ? updatedLesson : l));
      
      setQuizData(prev => ({
      ...prev,
      [targetId]: updatedLesson.content.map(item => ({
        q: item.japanese,
        a: item.english,
        options: item.options
      }))
    }));

      setEditingQuiz(null);
      setEditingLesson(null);
      setTempQuestions([]);
      alert("✅ Saved successfully to Cloud Database!");

    } catch (error) {
      console.error("❌ Failed to save:", error);
      alert("❌ Save Failed: " + error.message);
    }
  };

  const handleFinishQuiz = async (percentageScore, lessonIdParam) => {
    const isPassed = percentageScore >= 80; 
    const finalLessonId = lessonIdParam || (currentLesson && currentLesson._id);
    
    if (!finalLessonId) {
        console.error("❌ Cannot proceed: lesson ID not found.");
        return;
    }

    const resultData = {
      username: user,
      lessonTitle: currentLesson.title,
      lessonId: finalLessonId,
      score: percentageScore,
      status: isPassed ? 'completed' : 'failed'
    };

    try {
      const response = await fetch('http://localhost:5000/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultData)
      });

      if (response.ok) {
      console.log("✅ Quiz result synced to backend database.");

      if (typeof loadData === 'function') {
            loadData();
        }
      } else {
        const errorMsg = await response.json();
        console.error("❌ Regret to save:", errorMsg);
      }
    } catch (error) {
      console.error("❌ Failed to connect the network:", error);
    }
  };

  // Delete lesson (for admin)
  const handleDeleteLesson = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/lessons/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLessons(prev => prev.filter(l => l._id !== id));
        alert("Lesson deleted successfully!");
      } else {
        throw new Error("Failed to delete lesson.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.message);
    }
  };

  const handleToggleBookmark = async (word, lessonId) => {
    if (!user || !word) return;
    try {
      const response = await fetch('http://localhost:5000/api/bookmarks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user,
          lessonId: lessonId,
          q: word.q,
          a: word.a
        })
      });

      if (response.ok) {
        await loadData(); 
      }
    } catch (error) {
      console.error("Bookmark toggle failed:", error);
    }
  };

  // Delete user (for admin)
  const handleDeleteUser = async (usernameToDelete) => {
    // Security check
    if (usernameToDelete === 'admin') {
      alert("You cannot delete the admin user!");
      return;
    }

    // Double confirmation
    if (!window.confirm(`Are you sure you want to delete the user "${usernameToDelete}" ？All user data will be permanently removed.`)) {
      return;
    }

    try {
      // Call backend to delete user records
      const response = await fetch(`http://localhost:5000/api/users/${usernameToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {

        // Update frontend states
        const newUserRoles = { ...userRoles };
        delete newUserRoles[usernameToDelete];
        setUserRoles(newUserRoles);

        const newBookmarks = { ...bookmarks };
        delete newBookmarks[usernameToDelete];
        setBookmarks(newBookmarks);

        const newActivities = { ...activities };
        delete newActivities[usernameToDelete];
        setActivities(newActivities);

        const newCompleted = { ...completedLessons };
        delete newCompleted[usernameToDelete];
        setCompletedLessons(newCompleted);

        const newFailed = { ...failedLessons };
        delete newFailed[usernameToDelete];
        setFailedLessons(newFailed);

        setAllUsers(prevUsers => prevUsers.filter(user => {
          const name = typeof user === 'object' ? user.username : user;
          return name !== usernameToDelete;
        }));

        alert(`User ${usernameToDelete} and their database records have been removed.`);
      } else {
        alert("Failed to delete user from database.");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Network error while deleting user.");
    }
  };

  // Filter completed lessons for current user
  const userCompleted = (completedLessons[user] || []).filter(id => 
    lessons.some(lesson => lesson._id === id)
  );

  const loadData = useCallback(async () => {
    try {
      // Collect lessons from backend
      const [lessonsRes, resultsRes, usersRes, activitiesRes] = await Promise.all([
        fetch('http://localhost:5000/api/lessons'),
        fetch('http://localhost:5000/api/results'),
        fetch('http://localhost:5000/api/users'),
        fetch('http://localhost:5000/api/activities')
      ]);
      const lessonsData = await lessonsRes.json();
      const resultsData = await resultsRes.json();
      const usersData = await usersRes.json();
      const activitiesData = await activitiesRes.json();

      // Courses Data
      if (lessonsData) {
        setLessons(lessonsData);
        const dynamicQuiz = {};
        lessonsData.forEach((lesson) => {
          dynamicQuiz[lesson._id] = lesson.content.map(item => ({
            q: item.japanese,
            a: item.english,
            options: (item.options && item.options.length > 0) 
            ? item.options 
            : [item.english]
          }));  
        });
        setQuizData(dynamicQuiz);
      }

      // Users Data
      if (usersData && Array.isArray(usersData)) {
        setAllUsers(usersData);
      }

      // Activities Data
      if (activitiesData && Array.isArray(activitiesData)) {
        setActivities(activitiesData); 
      }

      // Quiz Results Data
      if (resultsData && Array.isArray(resultsData)) {
        setAllResults(resultsData);
        
        const newActivities = {};
        const newCompleted = {};
        const newFailed = {};        

        resultsData.forEach(res => {
          const { username, lessonId, status } = res;
          const idString = (lessonId && typeof lessonId === 'object') ? lessonId._id : lessonId;        
          if (username && idString) {
            if (!newActivities[username]) newActivities[username] = [];
            newActivities[username].push(res);

            if (status === 'completed') {
              if (!newCompleted[username]) newCompleted[username] = new Set();
              newCompleted[username].add(idString);
            } else {
              if (!newFailed[username]) newFailed[username] = new Set();
              newFailed[username].add(idString);
            }
          }
        });

        // Finalize Sets to Arrays
        const finalizedCompleted = {};
        Object.keys(newCompleted).forEach(u => finalizedCompleted[u] = Array.from(newCompleted[u]));
                
        const finalizedFailed = {};
        Object.keys(newFailed).forEach(u => finalizedFailed[u] = Array.from(newFailed[u]));

        // Update states
        setCompletedLessons(finalizedCompleted);
        setFailedLessons(finalizedFailed);
      } 

      // Bookmarks Data
      if (user && role === 'student') {
        try {
          const bkmRes = await fetch(`http://localhost:5000/api/bookmarks/${encodeURIComponent(user)}`);
          
          if (bkmRes.ok) {
            const bkmData = await bkmRes.json();

            let finalArray = [];
            if (Array.isArray(bkmData)) {
              finalArray = bkmData;
            } else if (bkmData && typeof bkmData === 'object') {
              finalArray = bkmData.bookmarks || bkmData.data || [];
            }
            setBookmarks(finalArray);
            
          } else {
            console.error("❌ Server Err:", bkmRes.status);
          }
        } catch (error) {
        }
      } 
    } catch (error) { 
      console.error("Data loading failed:", error);
    }
  }, [user, role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-save to localStorage on data changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('my_app_bookmarks', JSON.stringify(bookmarks || {}));
      localStorage.setItem('my_app_activities', JSON.stringify(activities || {}));
      localStorage.setItem('my_app_completed', JSON.stringify(completedLessons || {}));
      localStorage.setItem('my_app_failed', JSON.stringify(failedLessons || {}));
      localStorage.setItem('my_app_user_roles', JSON.stringify(userRoles || {}));
      localStorage.setItem('my_app_lessons', JSON.stringify(lessons || {}));
      localStorage.setItem('my_app_quiz_data', JSON.stringify(quizData || {}));
    }
  }, [bookmarks, activities, completedLessons, failedLessons, userRoles, lessons, quizData, user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const username = loginInput.trim();
    
    if (username !== "") {
    
      if (role === 'admin' && username.toLowerCase() !== 'admin') {
        alert("⚠️ Access denied.");
        return; 
      }

      try {
        // Connect to backend to login or create user
        const response = await fetch('http://localhost:5000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: username, 
            role: role 
          }),
        });

        if (!response.ok) throw new Error('Server response was not OK');

        const userData = await response.json();

        setUser(userData.username);
        setRole(userData.role); 
        
        
        setUserRoles(prev => ({
          ...prev,
          [userData.username]: userData.role
        }));

        setView('home');
        console.log("✅ Successfully logged in as:", userData.username);

      } catch (error) {
        console.error("❌ Login failed:", error);
        alert("Cannot connect to backend (node server.js)");
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setLoginInput("");
    setRole('student');
    setView('home');
    setSelectedStudent(null);
  };

  const startMode = (lesson, mode) => {
    setCurrentLesson(lesson);
    setView(mode);
    setScore(0);
    setCurrentQuestionIndex(0);
    setIsFlipped(false);
  };

  // Calculate pass/fail counts for each lesson
  const lessonStats = (lessons || []).map(lesson => {
    // Find out all data
    const resultsForThisLesson = allResults.filter(r => 
      r.lessonTitle === lesson.title || r.lessonId === lesson._id
    );

    // Caculate the total people of failed and passed 
    const passCount = resultsForThisLesson.filter(r => (Number(r.score) || 0) >= 60).length;
    const failCount = resultsForThisLesson.filter(r => (Number(r.score) || 0) < 60).length;

    return {
      name: lesson.title,
      pass: passCount, 
      fail: failCount, 
      total: passCount + failCount
    };
  });

  const handleEditClick = (lesson) => {
    setEditingQuiz(lesson); 
    const formattedQuestions = lesson.content.map(item => ({
      q: item.japanese || "",
      romaji: item.romaji || "",
      a: item.english || "",
      options: Array.isArray(item.options) ? item.options.join(', ') : ""
    }));

    setTempQuestions(formattedQuestions);
    setEditingLesson(lesson); 
  };

  // Calculate student progress
  const studentRanking = React.useMemo(() => {

    if (!lessons || lessons.length === 0) return [];

    // Collect all student datas
    const allNames = Array.from(new Set([
      ...Object.keys(activities || {}),
      ...Object.keys(completedLessons || {}),
      ...Object.keys(failedLessons || {})
    ]));

    // Calculate valid completed counts
    return allNames.map(name => {
      const studentDoneIds = completedLessons[name] || [];
      console.log(`Checking student: ${name}`, "IDs in State:", studentDoneIds);
      
      const validCount = studentDoneIds.filter(id => 
        lessons.some(l => String(l._id).trim() === String(id).trim())
      ).length;

      return {
        name: name,
        validCompletedCount: validCount
      };
    })
    // Sorting
    .sort((a, b) => b.validCompletedCount - a.validCompletedCount);
  }, [lessons, activities, completedLessons, failedLessons]);  
  
  // Calculate most bookmarked words
  const allBookmarkedItems = Array.isArray(bookmarks) 
  ? bookmarks 
  : Object.values(bookmarks || {}).flat();

  // Frequency count
  const wordFrequency = allBookmarkedItems.reduce((acc, item) => {
    if (item && item.q) {
      acc[item.q] = {
        count: (acc[item.q]?.count || 0) + 1,
        meaning: item.a
      };
    }
    return acc;
  }, {});

  // Get top 5 most bookmarked words
  const topHardWords = Object.entries(wordFrequency)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  // Calculate students who are struggling (failed 2 or more lessons)
  const strugglingStudents = Object.entries(failedLessons || {})
    .filter(([_, lessonList]) => lessonList && lessonList.length >= 2)
    .map(([name, lessonList]) => ({ name, count: lessonList.length }))
    .sort((a, b) => b.count - a.count);

  // --- 0. Login View ---
  if (!user) {
    return (
      <div className="App login-page">
        <div className="login-container">
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#2d3748', 
            marginBottom: '10px',
            whiteSpace: 'nowrap', 
            lineHeight: '1.2'
          }}>
            Welcome to Japanese Learning
          </h1>
          <div style={{ marginBottom: '30px' }}>
            <p style={{ 
              fontSize: '1.4rem', 
              color: '#4a5568', 
              margin: '0',
              fontWeight: '500'
            }}>
              日本語の学習へようこそ
            </p>
            <p style={{ 
              fontSize: '0.9rem', 
              color: '#718096', 
              marginTop: '5px',
              fontStyle: 'italic' 
            }}>
              (Nihongo no gakushū e yōkoso)
            </p>
          </div>
          
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="Username" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} required
            onInvalid={(e) => e.target.setCustomValidity('Please fill out this field')}
            onInput={(e) => e.target.setCustomValidity('')} />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="role-select">
              <option value="student">Student (Learn & Quiz)</option>
              <option value="teacher">Teacher (Analytics)</option>
              {loginInput.toLowerCase() === 'admin' && (
                <option value="admin">Administrator (System)</option>
              )}
            </select>
            <button type="submit">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  // --- 1. Flashcard View (For Student) ---
  if (view === 'flashcard') {
    const flashcards = quizData[currentLesson._id] || [];

    // Check if this card is already in the bookmarks.
    const isBookmarked = bookmarks.some(b => b.q === flashcards[currentQuestionIndex].q);

    return (
      <div className="App">
        <div className="quiz-container">
          <h1>Flashcards: {currentLesson.title}</h1>
          {/* Bookmark button */}
          <div style={{ textAlign: 'right', marginBottom: '10px' }}>
            <button onClick={()=>{
              const currentWord = flashcards[currentQuestionIndex];
              handleToggleBookmark(currentWord, currentLesson._id);
            }}
            className="star-btn"
            >
              {isBookmarked ? "⭐ Favorited" : "☆ Add to bookmarks"}
            </button>
          </div>

          <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
            <div className="card-content">
              {isFlipped ? flashcards[currentQuestionIndex].a : flashcards[currentQuestionIndex].q}
            </div>
            <p style={{ fontSize: '12px', color: '#999' }}>(Click to flip)</p>
          </div>

          <button onClick={() => {
            setIsFlipped(false);
            setCurrentQuestionIndex((currentQuestionIndex + 1) % flashcards.length);
          }}>Next Card</button>
          <button className="secondary" onClick={() => setView('home')}>Back to Lessons</button>
        </div>
      </div>
    );
  }

  // --- 2. Quiz View (For Student)---
  if (view === 'quiz') {
    const quizQuestions = quizData[currentLesson._id] || [];
    const progressPercent = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
    const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1;
    
    const handleAnswer = (selectedOption) => {
      let currentCorrect = selectedOption === quizQuestions[currentQuestionIndex].a;
      const newScore = currentCorrect ? score + 10 : score;
      if (currentCorrect) setScore(newScore);

      if (!isLastQuestion) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        const totalPossibleScore = quizQuestions.length * 10;
        const percentageScore = Math.round((newScore / totalPossibleScore) * 100);
        const passingScore = 80;

        let status = '';
        let message = '';

        if (percentageScore >= passingScore) {
          setCompletedLessons(prev => ({
            ...prev,
            [user]: [...new Set([...(prev[user] || []), currentLesson._id])]
          }));

          setFailedLessons(prev => ({
            ...prev,
            [user]: (prev[user] || []).filter(id => id !== currentLesson._id)
          }));

          status = 'completed';
          message = `You have passed the ${currentLesson.title} quiz!`;

          // Confetti effect
          if (window.confetti) {
            window.confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              zIndex: 9999
            });
          }

          // Delay alert to allow confetti to show
          setTimeout(() => {
            alert(`Congratulations! Score: ${percentageScore}%\nThis lesson has been marked as completed!`);
            setView('dashboard');
          }, 500);

        } else {

          setFailedLessons(prev => ({
            ...prev,
            [user]: [...new Set([...(prev[user] || []), currentLesson._id])]
          }));

          status = 'failed';
          message = `${currentLesson.title} quiz failed`;
          alert(`Score：${percentageScore}%.\nPlease try again.`);
        }

        handleFinishQuiz(percentageScore, currentLesson._id);

        // Record activity
        const newRecord = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: message,
          score: `${percentageScore}%`,
          status: status
        };

        // Keep only the latest 5 activities
        setActivities(prev => ({
          ...prev,
          [user]: [newRecord, ...(prev[user] || [])].slice(0, 5)
        }));

        setView('home');
        setScore(0);
        setCurrentQuestionIndex(0);
      }
    };

    return (
      <div className="App">
        <div className="quiz-container">
          <h1>Quiz: {currentLesson.title}</h1>

          {/* Progress Bar */}
          <div className="progress-wrapper">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="progress-text">Question {currentQuestionIndex + 1} of {quizQuestions.length}</p>
          </div>

          <div className="question-box">

            <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>
              {quizQuestions[currentQuestionIndex]?.japanese || quizQuestions[currentQuestionIndex]?.q}
            </h2>
            <div className="options-grid">
              {Array.isArray(quizQuestions[currentQuestionIndex]?.options) && 
              quizQuestions[currentQuestionIndex].options.length > 0 ? (
                quizQuestions[currentQuestionIndex].options.map((opt, idx) => (
                  <button key={idx} onClick={() => handleAnswer(opt)}>
                    {opt}
                  </button>
                ))
              ) : (
                <button onClick={() => handleAnswer(quizQuestions[currentQuestionIndex]?.a)}>
                  {quizQuestions[currentQuestionIndex]?.a} (Direct Answer)
                </button>
                
              )}
            </div>
          </div>

          <button className="secondary" onClick={() => setView('home')} style={{ marginTop: '20px' }}>Quit</button>
        </div>
      </div>
    );
  };

  // --- 3. Home View ---
  const totalLessons = lessons.length || 1;
  const displayPercent = Math.min(Math.round((userCompleted.length / totalLessons) * 100), 100);

  return (
    <div className="App">
      <header className="App-header">
        <div className="user-info">Logged in as: <strong>{user}</strong> ({role}) | <button onClick={handleLogout} className="logout-mini">Logout</button></div>
        <h1>{role.toUpperCase()} DASHBOARD</h1>
      </header>

      <main className="dashboard-content">
        {role === 'student' && (
          <>
            {/* stats overview */}
            <div className="stats-overview" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '30px', 
              background: 'white', 
              borderRadius: '24px', 
              marginBottom: '30px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid #edf2f7'
            }}>
              <div className="stat-item" style={{ textAlign: 'center', padding: '10px' }}>
                <div className="progress-circle-container" style={{ 
                  position: 'relative', width: '120px', height: '120px', borderRadius: '50%',
                  background: `conic-gradient(#4caf50 0%, #4caf50 ${displayPercent}%, #edf2f7 ${displayPercent}%, #edf2f7 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ position: 'absolute', width: '95px', height: '95px', background: 'white', borderRadius: '50%' }}></div>
                  <span style={{ position: 'relative', fontWeight: '800', fontSize: '24px', color: '#2d3748' }}>
                    {displayPercent}%
                  </span>
                </div>
              </div>

              <div className="stat-info" style={{ flex: 1, marginLeft: '40px' }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', color: '#1a202c' }}>
                  Welcome back, {user}! 👋
                </h2>
                <p style={{ color: '#718096', fontSize: '16px', margin: 0 }}>
                  You've completed <strong>{userCompleted.length}</strong> lessons.
                  {userCompleted.length === lessons.length ? " 🏆 Congratulations! You’ve unlocked all achievements!" : " Keep going, you're close to your goal!"}
                </p>
              </div>
            </div>

            {/* Lessons Grid */}
            <h3 style={{ marginBottom: '20px', color: '#2d3748', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              <span style={{ marginRight: '10px' }}>📚</span> My Learning Path
            </h3>
            <div className="lesson-list" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '20px',
            marginBottom: '40px'
          }}>
            {lessons.map(lesson => {
              const isCompleted = userCompleted.includes(lesson._id);
              const isFailed = userFailed.includes(lesson._id);

              return (
                <div key={lesson._id} className="lesson-card-pro" style={{ 
                  background: 'white', padding: '24px', borderRadius: '20px',
                  border: isCompleted ? '2px solid #c6f6d5' : isFailed ? '2px solid #fed7d7' : '1px solid #edf2f7',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'default'
                }}>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ 
                      fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px',
                      background: isCompleted ? '#f0fff4' : isFailed ? '#fff5f5' : '#f7fafc',
                      color: isCompleted ? '#38a169' : isFailed ? '#e53e3e' : '#718096',
                      textTransform: 'uppercase'
                    }}>
                      {isCompleted ? 'Completed' : isFailed ? 'Needs Review' : 'Not Started'}
                    </span>
                    <h3 style={{ margin: '12px 0 5px 0', color: '#2d3748' }}>{lesson.title}</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      onClick={() => startMode(lesson, 'flashcard')}
                      style={{ 
                        padding: '12px', background: '#ebf8ff', color: '#3182ce',
                        border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'
                      }}
                    >
                      📖 Practice Cards
                    </button>
                    <button 
                      onClick={() => startMode(lesson, 'quiz')}
                      style={{ 
                        padding: '12px', background: isCompleted ? '#4caf50' : '#2d3748', color: 'white',
                        border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    >
                      {isCompleted ? "Retake Quiz" : "Take Quiz →"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Info Bar (Activity & Bookmarks Side-by-Side) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}></div>

            {/* Recent Activity Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}></div>

            <div className="activity-section" style={{ 
              maxWidth: '800px', 
              margin: '0 auto 40px auto', 
              padding: '20px',
              background: 'white',
              borderRadius: '24px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ 
                marginTop: 0, 
                marginBottom: '20px', 
                color: '#2d3748', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '20px'
              }}>
                <span style={{ marginRight: '10px' }}>🕒</span> Recent Activity
              </h3>
              
              {Array.isArray(activities) && activities.filter(act => act.username === user).length > 0 ? (
                <ul className="activity-list" style={{ listStyle: 'none', padding: 0 }}>
                  {activities
                    .filter(act => act.username === user)
                    .slice(0, 5) 
                    .map((act, index) => (
                      <li key={act._id || index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '12px 15px',
                        borderBottom: '1px solid #f0f0f0',
                        textAlign: 'left'
                      }}>
                        <span style={{ color: '#a0aec0', fontSize: '13px', width: '80px' }}>
                          {new Date(act.timestamp).toLocaleDateString()}
                        </span>
                        <span style={{ flex: 1, fontWeight: '500', marginLeft: '10px' }}>
                          {act.action === 'completed' ? '✅ Completed' : '📝 Attempted'} {act.lessonTitle}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p style={{ color: '#999', fontSize: '14px', textAlign: 'center' }}>
                  No activity recorded yet.
                </p>
              )}
            </div>

            {/* Bookmarked Words Section */}
            <div className="dashboard-sub-card" style={{ background: 'white', padding: '25px', borderRadius: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>⭐ Bookmarked Words</h3>

                {Array.isArray(bookmarks) && bookmarks.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {bookmarks.map((b, index) => (
                    <div key={b._id || index} className="bookmark-tag">
                      <strong>{b.q}</strong> <span style={{color: '#718096'}}>({b.a})</span>
                      <button onClick={() => handleToggleBookmark({ q: b.q, a: b.a }, b.lessonId)}
                        style={{ 
                          border: 'none', 
                          background: 'none', 
                          color: '#a0aec0', 
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '0 0 0 5px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No bookmarked words yet.</p>
              )}
            </div>
          </>
        )}

        {role === 'teacher' && (
          <div className="teacher-view">
            <header style={{ marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
              <h2>🏫 Teacher Dashboard</h2>
              <p style={{ color: '#666', margin: 0 }}>
                Overview of student performance, insights, and content management system.
              </p>
            </header>

            <div className="teacher-grid"style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '30px' }}>
              
              {/* Class Performance Chart */}
              <div className="stat-card">
                <h3>📊 Class Performance</h3>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart 
                      data={lessonStats} 
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }} // 將 left 設為負值，吃掉多餘空白
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} /> {/* 隱藏垂直線會更清爽 */}
                      <XAxis 
                        dataKey="name" 
                        height={70}
                        style={{ fontSize: '10px' }} 
                        angle={-55}
                        interval={0} 
                        textAnchor="end"
                      />
                      <YAxis 
                        allowDecimals={false} 
                        width={35} 
                        style={{ fontSize: '12px' }} 
                      />
                      <Tooltip cursor={{fill: '#f5f5f5'}} />
                      <Bar dataKey="pass" fill="#4caf50" name="Passed" barSize={30} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="fail" fill="#f44336" name="Needs Help" barSize={30} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Student Rankings */}
              <div className="stat-card">
                <h3>🏆 Top Students</h3>
                <div className="rank-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {studentRanking.length > 0 ? (
                    studentRanking
                    .filter(stu => stu.name && stu.name.length > 1 && stu.name !== 'admin')
                    .map((stu, index) => (
                      <div 
                        key={`ranking-${stu.name}-${index}`}
                        onClick={() => setSelectedStudent(stu.name)} 
                        className="teacher-rank-row"
                        style={{ 
                          padding: '12px 15px', 
                          borderBottom: '1px solid #eee', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'background 0.2s'
                        }}
                      >
                        {/* Ranking Medal */}
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: index === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 
                                      index === 1 ? 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' : 
                                      index === 2 ? 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)' : '#f8fafc',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: '900',
                          color: index === 0 ? '#92400e' : index === 1 ? '#374151' : index === 2 ? '#9a3412' : '#94a3b8',
                          border: index === 0 ? '2px solid #fbbf24' : index === 1 ? '2px solid #d1d5db' : index === 2 ? '2px solid #fb923c' : '1px solid #ecf0f1',
                          boxShadow: index < 3 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', 
                          flexShrink: 0
                        }}>
                          #{index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : index + 1}
                        </div>

                        {/* Middle Section - Student Name */}
                        <div style={{ 
                          flex: '1', 
                          marginLeft: '20px',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          fontWeight: 'bold',
                          fontSize: '15px',
                          
                        }}>
                          {stu.name}
                        </div>

                        {/* Lesson Count Badge */}
                        <div 
                          key={`ranking-${stu.name}-${index}`}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: '800', 
                            padding: '3px 8px', 
                            borderRadius: '15px', 
                            background: index === 0 ? '#FEF3C7' : '#ecfdf5',
                            color: index === 0 ? '#92400E' : '#059669',
                            border: index === 0 ? '1px solid #fde68a' : '1px solid #d1fae5',
                            textTransform: 'uppercase',
                            
                          }}>
                            {stu.validCompletedCount} Lesson(s)
                          </span>

                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            color: '#2196f3', 
                            fontSize: '11px', 
                            minWidth: '100px', 
                            justifyContent: 'flex-end'
                          }}>
                            <span>View Details</span>
                            <span style={{ fontSize: '12px' }}>➔</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : <p style={{ color: '#999' }}>No student data.</p>}
                </div>
              </div>
            </div>

            {/* Difficult words and struggling students */}
            <div className="insights-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>

              {/* Difficult Words Ranking */}
              <div className="stat-card">
                <h3>🔥 Top Difficult Words</h3>
                {topHardWords.length > 0 ? (
                  topHardWords.map(([word, info], i) => (
                    <div key={i} style={{ padding: '10px', borderBottom: '1px dotted #ccc', display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>{word}</strong> <span style={{color:'#666'}}>{info.meaning}</span></span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', background: '#fff3e0', padding: '2px 8px', borderRadius: '10px', color: '#ff9800' }}>★ {info.count} saves</span>
                    </div>
                  ))
                ) : <p style={{ color: '#999' }}>No bookmarks recorded yet.</p>}
              </div>

              {/* Students Needing Support */}
              <div className="stat-card alert-card" style={{ borderLeft: '5px solid #ff4d4d' }}>
                <h3>⚠️ Students Needing Support</h3>
                {strugglingStudents.length > 0 ? (
                  strugglingStudents.map(stu => (
                    <div key={stu.name} style={{ padding: '10px', color: '#d32f2f', background: '#ffebee', marginBottom: '5px', borderRadius: '4px' }}>
                      👤 <strong>{stu.name}</strong> has failed {stu.count} quizzes repeatedly.
                    </div>
                  ))
                ) : <p style={{ color: '#4caf50', fontWeight: 'bold' }}>All students are doing great! ✨</p>}
              </div>
            </div>

            {/* Course Content Management */}
            <div className="stat-card" style={{ borderTop: '4px solid #2196f3', marginTop: '30px', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '20px' }}>📚 Course Content Management</h3>

              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '12px' }}>ID</th>
                      <th>Course Title</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center',width: '220px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map((lesson, index) => (
                      <tr key={lesson._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                          #{index + 1} 
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{lesson.title}</td>
                        <td>
                          {lesson.content && lesson.content.length > 0 
                            ? <span style={{ color: '#4caf50', fontSize: '14px' }}>✔ {lesson.content.length} Items</span>
                            : <span style={{ color: '#ff9800', fontSize: '14px' }}>⚠ Empty</span>
                          }
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn-small" 
                            onClick={() => handleEditClick(lesson)}
                            style={{ marginRight: '8px', background: '#2196f3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            onClick={() => {
                              if(window.confirm(`Are you sure you want to delete "${lesson.title}"?`)) {
                                handleDeleteLesson(lesson._id);
                              }
                            }}
                            style={{ background: '#ffebee', color: '#d32f2f', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#fafafa' }}>
                      <td style={{ padding: '15px 12px' }}>+</td>
                      <td colSpan="2">
                        <input 
                          value={newLessonTitle} 
                          onChange={(e) => setNewLessonTitle(e.target.value)} 
                          placeholder="New course title..." 
                          style={{ width: '90%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={handleAddLesson} style={{ background: '#4caf50', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer' }}>
                          Add
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {selectedStudent && (
              <div className="student-modal-overlay" style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
              }}>
                <div className="student-modal" style={{
                  background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px', color: '#333'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>📊 {selectedStudent}'s Learning Details</h2>
                  </div>
                  <div className="report-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {lessons.map(lesson => {
                      const studentName = typeof selectedStudent === 'object' ? selectedStudent.name : selectedStudent;
                      
                      // Get the score of the certain lesson (of this student)
                      const relevantResults = allResults.filter(r => 
                        r.username === studentName && 
                        (r.lessonTitle === lesson.title || r.lessonId === lesson._id)
                      );

                      // Get the highest score
                      const scores = relevantResults.map(r => parseInt(r.score) || 0);
                      const bestScore = scores.length > 0 ? Math.max(...scores) : null;

                      // state
                      const isPassed = bestScore !== null && bestScore >= 60;
                      const isAttempted = scores.length > 0;
                      return (
                        <div key={lesson._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                          <span>{lesson.title}</span>
                          <span style={{ 
                            fontWeight: 'bold', 
                            color: isPassed ? '#4caf50' : (isAttempted ? '#f44336' : '#999') 
                          }}>
                            {isPassed ? (
                                `Passed ${bestScore ? `(${bestScore}%)` : ''}`
                            ) : isAttempted ? (
                                `Needs Review ${bestScore ? `(${bestScore}%)` : ''}`
                            ) : (
                                'Not Attempted'
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <button className="secondary" onClick={() => setSelectedStudent(null)} style={{ width: '100%', marginTop: '20px', padding: '10px' }}>Close</button>
                </div>
              </div>
            )}

            {/* Quiz Edition */}
            {editingQuiz && (
              <div className="modal-overlay" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.8)', padding: '20px', overflowY: 'auto', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                <div style={{ background: '#f5f7fa', padding: '40px', borderRadius: '12px', width: '800px', maxWidth: '100%', marginTop: '50px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                    <h2 style={{ margin: 0 }}>📝 Edit Quiz: {editingQuiz.title}</h2>
                    <button onClick={() => setEditingQuiz(null)} style={{ background: '#e41d1dbb', border: '1px solid #999', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}>Cancel ✕</button>
                  </div>

                  {/* Question List */}
                  <div style={{ marginBottom: '30px' }}>
                    {tempQuestions.map((q, idx) => (
                      <div key={idx} style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e0e0e0', position: 'relative', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <h4 style={{ margin: 0, color: '#2196f3' }}>Question {idx + 1}</h4>
                          <button 
                            onClick={() => setTempQuestions(tempQuestions.filter((_, i) => i !== idx))}
                            style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '14px' }}
                          >
                            🗑️ Remove Question
                          </button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#555' }}>Question (Front)</label>
                            <input 
                              value={q.q} 
                              onChange={e => { const n = [...tempQuestions]; n[idx].q = e.target.value; setTempQuestions(n); }} 
                              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                              placeholder="e.g., Apple"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#555' }}>Answer (Back)</label>
                            <input 
                              value={q.a} 
                              onChange={e => { const n = [...tempQuestions]; n[idx].a = e.target.value; setTempQuestions(n); }} 
                              style={{ width: '100%', padding: '8px', border: '2px solid #e8f5e9', background: '#f1f8e9', borderRadius: '4px' }} 
                              placeholder="e.g., りんご"
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#555' }}>Options (Comma Separated)</label>
                          <input 
                            value={Array.isArray(q.options) ? q.options.join(', ') : q.options || ""}
                            onChange={e => { 
                              const n = [...tempQuestions]; 
                              n[idx].options = e.target.value; 
                              setTempQuestions(n); 
                            }} 
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            placeholder="e.g., りんご, みかん, ばなな"
                          />
                          <p style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>* Tip: Make sure the correct answer is included in this list.</p>
                        </div>
                      </div>
                    ))}
                    
                    {tempQuestions.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#999', border: '2px dashed #ccc', borderRadius: '8px', background: '#fafafa' }}>
                        This quiz has no questions yet.<br/>Click "Add New Question" below to start.
                      </div>
                    )}
                  </div>

                  {/* Button */}
                  <div style={{ display: 'flex', gap: '15px', borderTop: '2px solid #ddd', paddingTop: '20px' }}>
                    <button 
                      onClick={() => setTempQuestions([...tempQuestions, { q: '', a: '', options: [] }])}
                      style={{ flex: 1, padding: '12px', background: '#fff', color: '#2196f3', border: '2px dashed #2196f3', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      + Add New Question
                    </button>
                    
                    <button 
                      onClick={handleSaveContent}
                      style={{ 
                        flex: 1, 
                        padding: '12px', 
                        background: '#4caf50', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px', 
                        cursor: 'pointer', 
                        fontWeight: 'bold' 
                      }}
                    >
                      💾 Save All Changes
                    </button>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}
        
        {role === 'admin' && (
          <div className="admin-view" style={{ 
            maxWidth: '1250px', 
            margin: '0 auto', 
            padding: '20px 40px', 
            animation: 'fadeIn 0.5s ease', 
            color: '#2d3748' 
          }}>

            {/* 1. Header */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '30px',padding: '10px 0', width: '100%' }}>
              <h2 style={{ margin: 0, fontSize: '28px', color: '#1a202c' }}>🛡️ System Admin Control Panel</h2>
              <div style={{ position: 'absolute', right: 0, fontSize: '14px', background: '#e2e8f0', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
                System Status: <span style={{ color: '#38a169' }}>● Online</span>
              </div>
            </div>

            {/* 2. Quick Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderTop: '4px solid #4a5568' }}>
                <div style={{ color: '#718096', fontSize: '14px', fontWeight: 'bold' }}>TOTAL USERS</div>
                <div style={{ fontSize: '24px', fontWeight: '800' }}>{allUsers.length}</div>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderTop: '4px solid #3182ce' }}>
                <div style={{ color: '#718096', fontSize: '14px', fontWeight: 'bold' }}>TOTAL COURSES</div>
                <div style={{ fontSize: '24px', fontWeight: '800' }}>{lessons.length}</div>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderTop: '4px solid #e53e3e' }}>
                <div style={{ color: '#718096', fontSize: '14px', fontWeight: 'bold' }}>SYSTEM HEALTH</div>
                <div style={{ fontSize: '24px', fontWeight: '800' }}>Stable</div>
              </div>
            </div>

            {/* 3. Main Admin Grid */}
            <div className="admin-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.1fr 0.9fr', 
              gap: '30px',
              alignItems: 'stretch' 
            }}>
              {/* 3.1 User Management Card */}
              <div className="stat-card" style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a202c', textAlign: 'center', marginTop: 0, marginBottom: '25px' }}>
                  👥 User Directory
                </h3>

                {/* Add User Form */}
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const name = e.target.newUserName.value.trim();
                    const roleType = e.target.newUserRole.value;

                    if (name) {
                      await fetch('http://localhost:5000/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: name, role: roleType }),
                      });
                      e.target.reset();
                      loadData(); 
                    } 
                  }}
                  style={{ 
                    display: 'flex', gap: '10px', marginBottom: '30px', padding: '15px', 
                    background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' 
                  }}
                >
                  <input 
                    name="newUserName" type="text" placeholder="Enter user name..." required 
                    style={{ flex: 1.5, padding: '10px 14px', border: '1px solid #cbd5e0', borderRadius: '10px', fontSize: '14px', outline: 'none' }} 
                  />
                  <select 
                    name="newUserRole" 
                    style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e0', borderRadius: '10px', background: 'white', fontSize: '14px', cursor: 'pointer' }}
                  >
                    <option value="student">🎓 Student</option>
                    <option value="teacher">👨‍🏫 Teacher</option>
                  </select>
                  <button 
                    type="submit" 
                    style={{ 
                      flex: 0.7, background: '#1a202c', color: 'white', border: 'none', 
                      borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    Create
                  </button>
                </form>

                {/* User List Container */}
                <div className="user-list" style={{ 
                  maxHeight: '1000px', overflowY: 'auto', paddingRight: '5px',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '12px' 
                }}>
                  {allUsers
                    // To make sure no duplicate usernames appear
                    .filter((userItem, index, self) => {
                      const name = typeof userItem === 'object' ? userItem.username : userItem;
                      return self.findIndex(u => (typeof u === 'object' ? u.username : u) === name) === index;
                    })
                    
                    // To sort users alphabetically
                    .map((userItem) => {
                      const currentName = typeof userItem === 'object' ? userItem.username : userItem;
                      const userRole = typeof userItem === 'object' ? userItem.role : (userRoles[currentName] || 'student');
                      const roleStyles = {
                        admin: { bg: '#1a202c', color: '#ffffff', label: 'ADMIN' },
                        teacher: { bg: '#E3F2FD', color: '#1976D2', label: 'TEACHER' },
                        student: { bg: '#FFF3E0', color: '#E65100', label: 'STUDENT' }
                    };
                    const theme = roleStyles[userRole] || roleStyles.student;

                    return (
                      <div 
                        key={typeof userItem === 'object' ? userItem._id : currentName}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '10px 14px', 
                          borderRadius: '10px', 
                          background: '#ffffff',
                          border: '1px solid #f1f5f9',
                        }}
                      >
                        {/* User Photo */}
                        <div style={{ 
                          width: '40px', height: '40px', borderRadius: '8px', 
                          background: userRole === 'admin' ? '#1a202c' : '#e9e6e6ff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '20px', marginRight: '12px', flexShrink: 0
                        }}>
                          {userRole === 'admin' ? '🔑' : userRole === 'teacher' ? '💼' : '🎓'}
                        </div>

                        {/* User Name */}
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <span style={{ 
                            fontWeight: '700', fontSize: '15px', color: '#2d3748', 
                            marginRight: '8px', minWidth: '60px' 
                          }}>
                            {currentName}
                          </span>
                          <span style={{ 
                            fontSize: '9px', fontWeight: '800', padding: '1px 6px', 
                            borderRadius: '4px', background: theme.bg, color: theme.color,
                            letterSpacing: '0.5px', flexShrink: 0
                          }}>
                            {theme.label}
                          </span>
                        </div>

                        {/* Delete Button */}
                        <div style={{ marginLeft: '15px' }}>
                          {currentName !== 'admin' ? (
                            <button 
                              onClick={() => handleDeleteUser(currentName)} 
                              style={{ 
                                background: 'none', border: 'none', color: '#e53e3e', 
                                cursor: 'pointer', fontSize: '15px', fontWeight: 'bold',
                                padding: '4px 8px', transition: 'opacity 0.2s',
                              }}
                              onMouseOver={(e) => { e.target.style.textDecoration = 'underline'; }}
                              onMouseOut={(e) => { e.target.style.textDecoration = 'none'; }}
                            >
                              Remove
                            </button>
                          ) : (
                            <span style={{ fontSize: '15px', color: '#cbd5e0', fontWeight: 'bold', padding: '0 8px' }}>
                              SYSTEM ROOT
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3.2 System Maintenance */}
              <div className="stat-card" style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a202c', textAlign: 'center', marginTop: 0, marginBottom: '25px' }}>
                  🛠️ System Maintenance
                </h3>

                {/* State */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                  <div style={{ flex: 1, padding: '10px 15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                    <div style={{ fontSize: '15px', color: '#718096', fontWeight: '800', letterSpacing: '0.5px' }}>DATABASE</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#38a169', marginTop: '2px' }}>● Connected</div>
                  </div>
                  <div style={{ flex: 1, padding: '10px 15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                    <div style={{ fontSize: '15px', color: '#718096', fontWeight: '800', letterSpacing: '0.5px' }}>SECURITY</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#3182ce', marginTop: '2px' }}>SSL Active</div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="stat-card" style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a202c', textAlign: 'center', marginTop: 0, marginBottom: '25px' }}>
                    🕒 Recent System Activity
                  </h3>
                    
                  {/* Recent Activity */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {activities.length > 0 ? (
                      activities.slice(0, 5).map((log, i) => {
                        
                        let statusIcon = "📝"; 
                        let statusText = "Attempted"; 

                        if (log.score !== undefined) {
                          statusIcon = "🏆";
                          statusText = `Finished with ${log.score}%`;
                        } else if (log.type === 'bookmark') {
                          statusIcon = "⭐";
                          statusText = "Bookmarked word in";
                        } else if (log.action === 'completed') {
                          statusIcon = "✅";
                          statusText = "Completed";
                        }
                        
                        return ( 
                          <div key={log._id || i} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            fontSize: '15px', 
                            borderLeft: '4px solid #3182ce', 
                            paddingLeft: '15px',
                            padding: '12px 0 12px 15px'
                          }}>
                            <div>
                              <span style={{ fontWeight: '700', color: '#4a5568' }}>
                                {log.username}
                              </span>

                              <span style={{ color: '#718096', marginLeft: '10px' }}>
                                {statusIcon} {statusText} 
                                <span style={{ fontWeight: '600', color: '#4a5568', marginLeft: '5px' }}>
                                  "{log.lessonTitle || log.lessonId || 'General Lesson'}"
                                </span>
                              </span>
                            </div>

                            <span style={{ fontSize: '13px', color: '#a0aec0', fontWeight: '500' }}>
                              {log.timestamp ? (
                                new Date(log.timestamp).toLocaleTimeString('en-US', { // 💡 加入 'en-US'
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  hour12: true 
                                })
                              ) : '---'}
                            </span>
                          </div>
                        ); 
                      }) 
                    ) : (
                      <div style={{ textAlign: 'center', color: '#a0aec0', padding: '20px' }}>
                        No recent activities found.
                      </div>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#a0aec0', lineHeight: '1.5', marginBottom: '15px', fontStyle: 'italic' }}>
                  Caution: Reset will erase all records.
                </p>
                
                {/* Risk Management */}
                <div style={{ background: '#fff5f5', padding: '15px', borderRadius: '12px', border: '1px solid #feb2b2' }}>
                  <button
                    style={{ width: '100%', backgroundColor: '#e53e3e', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '8px' }}
                    onClick={async () => {
                      
                      if (window.confirm("⚠️ CRITICAL WARNING: This will permanently delete ALL users, scores, and activity logs from the DATABASE. Proceed?")) {
                        // Double check
                        if (prompt("To confirm, please type 'RESET' in all caps:") === 'RESET') {
                          try {
                            // Perform resetting all data
                            const response = await fetch('http://localhost:5000/api/system/reset', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' }
                            });

                            if (response.ok) {
                              localStorage.clear(); 
                              alert("System Database Wiped. The system is now clean.");
                              window.location.reload();
                            } else {
                              const errorData = await response.json();
                              alert(`Reset failed: ${errorData.message}`);
                            }
                          } catch (error) {
                            console.error("System reset error:", error);
                            alert("Network error. Could not connect to server to perform reset.");
                          }
                        }
                      }
                    }}
                  >
                    Reset All System Data
                  </button>
                  <div style={{ textAlign: 'center', fontSize: '11px', color: '#c53030' }}>Emergency maintenance only.</div>
                </div>
              </div>

            </div>

            {/* 4. Course Content Management */}
            <div className="stat-card" style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginTop: '40px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a202c', textAlign: 'center', marginTop: 0, marginBottom: '25px' }}>
                📚 Course Content Management
              </h3>

              <div style={{ display: 'flex', padding: '12px', borderBottom: '2px solid #edf2f7', color: '#718096', fontSize: '14px', fontWeight: 'bold', background: '#fcfcfc' }}>
                <div style={{ width: '60px' }}>ID</div>
                <div style={{ flex: 2.5 }}>Course Title</div>
                <div style={{ width: '100px', textAlign: 'center' }}>Status</div>
                <div style={{ width: '180px', textAlign: 'center' }}>Action</div>
              </div>
              
              <div className="admin-list">
                {lessons.map(lesson => (
                  <div key={lesson._id} style={{ display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid #edf2f7', fontSize: '17px' }}>
                    <div style={{ width: '60px', color: '#a0aec0' }}>#{lesson._id}</div>
                    <div style={{ flex: 2.5, fontWeight: 'bold', color: '#2d3748' }}>{lesson.title}</div>
                    <div style={{ width: '100px', display: 'flex', justifyContent: 'center' }}>
                      <span style={{ color: '#38a169', background: '#f0fff4', padding: '2px 10px', borderRadius: '10px', fontSize: '12px' }}>Active</span>
                    </div>
                    <div style={{ width: '180px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button onClick={() => setEditingQuiz(lesson)} style={{ background: '#ebf8ff', color: '#3182ce', border: 'none', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Edit</button>
                      <button onClick={() => handleDeleteLesson(lesson._id)} style={{ background: '#fff5f5', color: '#e53e3e', border: 'none', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Lesson Input */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '15px 12px', background: '#f8fafc', borderRadius: '12px', marginTop: '15px' }}>
                <div style={{ width: '60px', color: '#718096', fontSize: '13px' }}>NEW</div>
                <div style={{ flex: 2.5 }}>
                  <input type="text" placeholder="New lesson title..." value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} style={{ width: '90%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                </div>
                <div style={{ width: '100px' }}></div>
                <div style={{ width: '180px' }}>
                  <button onClick={handleAddLesson} style={{ background: '#38a169', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>+ Add Lesson</button>
                </div>
              </div>
            </div>
            
            {/* 5. Editing Panel */}
            {editingLesson && (
              <div style={{ marginTop: '30px', padding: '30px', background: '#f0f9ff', border: '2px solid #3182ce', borderRadius: '20px', animation: 'slideDown 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0 }}>📝 Editing Questions: {editingLesson.title}</h3>
                  <button onClick={() => setEditingLesson(null)} style={{ background: '#4a5568', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>✕ Close</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                  {(quizData[editingLesson._id] || []).map((item, idx) => (
                    <div key={idx} style={{ background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #bee3f8', fontSize: '14px' }}>
                      <div style={{ color: '#3182ce', fontWeight: 'bold', marginBottom: '5px' }}>Q{idx + 1}</div>
                      <div>{item.q}</div>
                      <div style={{ color: '#718096', fontSize: '12px' }}>Ans: {item.a}</div>
                    </div>
                  ))}
                </div>
                <button 
                  style={{ width: '100%', padding: '15px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  onClick={() => {
                    const newQ = prompt("Enter a Japanese word:");
                    const newA = prompt("Enter correct translation:");
                    if (newQ && newA) {
                      const newQuestionObj = { q: newQ, a: newA, options: [newA, "wrong1", "wrong2"].sort(() => Math.random() - 0.5) };
                      setQuizData({ ...quizData, [editingLesson._id]: [...(quizData[editingLesson._id] || []), newQuestionObj] });
                    }
                  }}
                >
                  + Add New Question
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;