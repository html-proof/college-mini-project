const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbHelper = require('../services/dbService');
const { SECRET_KEY } = require('../middleware/auth');

// REGISTER USER
const register = async (req, res) => {
  const { full_name, email, password } = req.body;
  
  if (!email || !password || !full_name) {
    return res.status(400).json({ message: 'Full name, email, and password are required!' });
  }

  try {
    // Check if user already exists
    const existingUser = await dbHelper.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered!' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const profileImagePath = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Insert new user
    const result = await dbHelper.run(
      'INSERT INTO users (name, email, password_hash, profile_image, role) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, passwordHash, profileImagePath, 'student']
    );
    const userId = result.lastID;

    // Create student profile
    const studentResult = await dbHelper.run(
      'INSERT INTO students (user_id, semester, department, learning_level) VALUES (?, 1, \'Computer Science\', \'Beginner\')',
      [userId]
    );
    const studentId = studentResult.lastID;

    // Seed default student progress for all initial lessons (so they appear on the dashboard)
    const lessons = await dbHelper.all('SELECT lesson_id FROM lessons');
    for (const lesson of lessons) {
      await dbHelper.run(
        'INSERT INTO student_progress (student_id, lesson_id, score, completion_percentage, time_spent) VALUES (?, ?, 0, 0.0, 0.0)',
        [studentId, lesson.lesson_id]
      );
    }

    // Seed a default learning path
    await dbHelper.run(
      'INSERT INTO learning_path (student_id, current_topic, next_topic, difficulty) VALUES (?, ?, ?, ?)',
      [studentId, 'Introduction to Computer Science', 'Variables and Operators', 'Beginner']
    );

    return res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: `Registration failed: ${error.message}` });
  }
};

// LOGIN USER
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required!' });
  }

  try {
    const user = await dbHelper.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ message: 'Invalid email or password!' });
    }

    const token = jwt.sign({ user_id: user.id }, SECRET_KEY, { expiresIn: '24h' });
    return res.json({
      token,
      user: {
        full_name: user.name,
        username: user.email.split('@')[0],
        email: user.email,
        profile_image: user.profile_image
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: `Login failed: ${error.message}` });
  }
};

module.exports = {
  register,
  login
};
