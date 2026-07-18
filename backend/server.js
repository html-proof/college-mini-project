const express = require('express');
const cors = require('cors');
const path = require('path');
const dbHelper = require('./services/dbService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const quizRoutes = require('./routes/quizRoutes');
const tutorRoutes = require('./routes/tutorRoutes');
const materialsRoutes = require('./routes/materialsRoutes');
const studyRoutes = require('./routes/studyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/study', studyRoutes);

// Database and server boot sequence
(async () => {
  try {
    // Dynamically initialize schema and seed data
    await dbHelper.initDb();
    
    app.listen(PORT, () => {
      console.log(`Express Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
})();
