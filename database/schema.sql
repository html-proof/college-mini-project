-- schema.sql
-- Relational Database Schema for Personalized Tutor System

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_image TEXT,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
  student_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semester INTEGER DEFAULT 1,
  department TEXT DEFAULT 'Computer Science',
  learning_level TEXT DEFAULT 'Beginner'
);

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS courses (
  course_id SERIAL PRIMARY KEY,
  course_name TEXT UNIQUE NOT NULL,
  description TEXT,
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
  lesson_id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  difficulty TEXT DEFAULT 'Beginner'
);

-- 5. Quiz Table
CREATE TABLE IF NOT EXISTS quiz (
  quiz_id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
  difficulty TEXT DEFAULT 'Beginner'
);

-- 6. Questions Table
CREATE TABLE IF NOT EXISTS questions (
  question_id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES quiz(quiz_id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL
);

-- 7. Student Progress Table
CREATE TABLE IF NOT EXISTS student_progress (
  progress_id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  completion_percentage REAL DEFAULT 0.0,
  time_spent REAL DEFAULT 0.0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Chat History Table
CREATE TABLE IF NOT EXISTS chat_history (
  chat_id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Learning Path Table
CREATE TABLE IF NOT EXISTS learning_path (
  path_id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  current_topic TEXT NOT NULL,
  next_topic TEXT NOT NULL,
  difficulty TEXT DEFAULT 'Beginner'
);

-- 10. Badges Table
CREATE TABLE IF NOT EXISTS badges (
  badge_id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  earned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Study Materials Table
CREATE TABLE IF NOT EXISTS study_materials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
