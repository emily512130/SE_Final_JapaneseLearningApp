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
- **Automated Analytics**: Automatically processes quiz scores to calculate class pass/fail rates.
- **Teacher Dashboard**: Visualizes learning performance using Recharts for intuitive data interpretation.
- **Intelligent Alerting**: Detects lessons with high failure rates and marks them as high-difficulty content.
- **Data Integrity**: Fully integrated with MongoDB Atlas to ensure persistent and reliable student records.

---

## 🛠️ How to Build and Run

### 1. Prerequisites
- **Node.js**: Version 16.x or higher
- **Database**: MongoDB Atlas instance

### 2. Installation
Open your terminal in the project root directory and run:
```bash
npm install
```
### 3. Execution
To run the system, you need to start both the backend and frontend:

**Start Backend:**
```bash
node server/server.js
```
**Start Frontend:**
```bash
npm start
```
The application will launch at http://localhost:3000.

## 📂 Folder Structure
- **/src**: Frontend components (Dashboard, Charts, UI).

- **/server**: Backend API and MongoDB connection logic.

- **README.md**: Project documentation.

## 🔗 Repository Link
-**GitHub**: [https://github.com/emily512130/SE_Final_JapaneseLearningApp](https://github.com/emily512130/SE_Final_JapaneseLearningApp)