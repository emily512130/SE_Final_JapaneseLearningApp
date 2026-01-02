# Japanese Learning App - Teacher Management System 🇯🇵

## 👥 Team Information
- **Course**: NTPU 114-1 Software Engineering Final Project
- **Lead Developer**: Li, Ting Yu (Student ID: 411187038, EE Undergraduate)
- **Team Members**: 
    - Su, Yi Ching  (Student ID: 411176100, EE Undergraduate)
    - Meng, Hui Yu  (Student ID: 711482105, EE Master's Student)
    - Lin, Yu Kai   (Student ID: 711482103, EE Master's Student)

---

## 📝 Project Description
This application is a specialized management tool for Japanese language educators.  
It integrates a React-based frontend with a MongoDB Atlas backend to provide real-time student performance analytics and learning insights.

### Key Features:
- **Real-time Activity Logs**: Chronological tracking of student actions with precise timestamps.
- **Automated Analytics**: Processes quiz scores to calculate class pass/fail rates automatically.
- **Intelligent Alerting**: Dynamically identifies students needing support based on current failure gaps.
- **Global Difficulty Tracking**: Aggregates bookmarked vocabulary to highlight challenging content.
- **Data Integrity**: Fully integrated with MongoDB Atlas for persistent and reliable cloud storage.

---

## 🛠️ How to Build and Run

### 1. Prerequisites
Before running the application, ensure the following tools are installed:
- **Node.js**: The JavaScript runtime required to run both the server and the frontend. Version 24.12.0 or Higher
- **NPM**: Included with Node.js to manage project dependencies.

### 2. Installation
This project consists of two parts: the Frontend (React) and the Backend (Node/Express). You must install dependencies for both.

**Frontend Setup:** Open your terminal in the main project folder and run:
```bash
# Install React and dashboard UI libraries
npm install
```

**Backend Setup:** Navigate to the server directory and install the database and API libraries:
```bash
# Navigate to the server folder
cd server

# Install Express, Mongoose, and other backend tools
npm install
```

### 3. Execution
You need to have two terminal windows open simultaneously to run the full system.

**Terminal 1: Start Backend:**
```bash
# From the root directory
node server/server.js
```
(You should see: "✅ Successfully connected to MongoDB Atlas!")

**Terminal 2: Start Frontend:**
```bash
# From the root directory
npm start
```
The application will launch at http://localhost:3000.

## 📂 Folder Structure
- **/src**: Frontend React components, visual charts, and student activity logic.

- **/server**: Backend Node.js API, Express routes, and MongoDB Atlas connection.

- **/server/models**: Mongoose schemas for Users, Results, Activities, and Bookmarks.

- **README.md**: Full project documentation and setup guide.

## 🔗 Repository Link
-**GitHub**: [https://github.com/emily512130/SE_Final_JapaneseLearningApp](https://github.com/emily512130/SE_Final_JapaneseLearningApp)