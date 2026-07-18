const dbHelper = require('../services/dbService');

const getProfile = async (req, res) => {
  const user = req.currentUser;

  try {
    // 1. Get student profile
    const student = await dbHelper.get('SELECT * FROM students WHERE user_id = ?', [user.id]);
    if (!student) {
      // Return empty profile for teachers or admin
      return res.json({
        full_name: user.name,
        username: user.email.split('@')[0],
        email: user.email,
        profile_image: user.profile_image,
        mastery: [],
        metrics: { hours_studied: 0.0, quizzes_completed: 0, last_active: new Date().toISOString() },
        recent_quizzes: []
      });
    }

    const studentId = student.student_id;

    // 2. Fetch subject mastery (aggregated from lessons and course records)
    const masteryList = await dbHelper.all(`
      SELECT 
        c.course_name as subject,
        COALESCE(CAST(AVG(sp.score) AS INTEGER), 0) as score,
        MAX(sp.last_updated) as last_updated
      FROM courses c
      LEFT JOIN lessons l ON c.course_id = l.course_id
      LEFT JOIN student_progress sp ON l.lesson_id = sp.lesson_id AND sp.student_id = ?
      GROUP BY c.course_name
    `, [studentId]);

    // Map mastery list and compute levels
    const formattedMastery = masteryList.map(m => {
      const score = m.score !== null ? m.score : 0;
      let level = 'Beginner';
      if (score >= 75) level = 'Advanced';
      else if (score >= 50) level = 'Intermediate';
      
      return {
        subject: m.subject,
        score: score,
        level: level,
        last_updated: m.last_updated || new Date().toISOString()
      };
    });

    // 3. Fetch study metrics
    const metricsResult = await dbHelper.get(`
      SELECT 
        COALESCE(SUM(time_spent), 0.5) as hours_studied,
        COUNT(CASE WHEN completion_percentage > 0 THEN 1 END) as quizzes_completed,
        MAX(last_updated) as last_active
      FROM student_progress 
      WHERE student_id = ?
    `, [studentId]);

    const metricsData = {
      hours_studied: Math.round((metricsResult.hours_studied || 0.5) * 10) / 10,
      quizzes_completed: parseInt(metricsResult.quizzes_completed || 0),
      last_active: metricsResult.last_active || new Date().toISOString()
    };

    // 4. Fetch recent quizzes (completions)
    const recentQuizzes = await dbHelper.all(`
      SELECT 
        sp.progress_id as id,
        c.course_name as subject,
        sp.score as score,
        5 as total_questions,
        CAST((sp.score * 20) AS REAL) as percentage,
        sp.last_updated as timestamp
      FROM student_progress sp
      JOIN lessons l ON sp.lesson_id = l.lesson_id
      JOIN courses c ON l.course_id = c.course_id
      WHERE sp.student_id = ? AND sp.completion_percentage > 0
      ORDER BY sp.last_updated DESC
      LIMIT 5
    `, [studentId]);

    return res.json({
      full_name: user.name,
      username: user.email.split('@')[0],
      email: user.email,
      profile_image: user.profile_image,
      mastery: formattedMastery,
      metrics: metricsData,
      recent_quizzes: recentQuizzes.map(q => ({
        id: q.id,
        subject: q.subject,
        score: q.score,
        total_questions: q.total_questions,
        percentage: q.percentage,
        timestamp: q.timestamp
      }))
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ message: `Failed to load profile: ${error.message}` });
  }
};

const trackStudyTime = async (req, res) => {
  const { hours } = req.body;
  if (hours === undefined || isNaN(hours)) {
    return res.status(400).json({ message: 'Hours parameter is required!' });
  }

  const hoursFloat = parseFloat(hours);
  if (hoursFloat <= 0) {
    return res.status(400).json({ message: 'Hours must be positive!' });
  }

  const user = req.currentUser;

  try {
    const student = await dbHelper.get('SELECT student_id FROM students WHERE user_id = ?', [user.id]);
    if (!student) {
      return res.status(400).json({ message: 'Only registered students can track study hours.' });
    }
    const studentId = student.student_id;

    // Find the last active lesson progress to attribute time_spent to, or insert a default progress record
    let activeProgress = await dbHelper.get('SELECT lesson_id FROM student_progress WHERE student_id = ? ORDER BY last_updated DESC LIMIT 1', [studentId]);
    if (!activeProgress) {
      // Fallback to first lesson
      const firstLesson = await dbHelper.get('SELECT lesson_id FROM lessons LIMIT 1');
      if (firstLesson) {
        await dbHelper.run('INSERT INTO student_progress (student_id, lesson_id, score, completion_percentage, time_spent) VALUES (?, ?, 0, 0.0, 0.0)', [studentId, firstLesson.lesson_id]);
        activeProgress = { lesson_id: firstLesson.lesson_id };
      }
    }

    if (activeProgress) {
      await dbHelper.run(`
        UPDATE student_progress 
        SET time_spent = time_spent + ?, last_updated = CURRENT_TIMESTAMP 
        WHERE student_id = ? AND lesson_id = ?
      `, [hoursFloat, studentId, activeProgress.lesson_id]);
    }

    const updatedMetrics = await dbHelper.get(`
      SELECT SUM(time_spent) as hours_studied 
      FROM student_progress 
      WHERE student_id = ?
    `, [studentId]);

    return res.json({
      message: `Tracked ${hoursFloat} study hours successfully!`,
      total_hours: Math.round((updatedMetrics.hours_studied || 0.5) * 10) / 10
    });
  } catch (error) {
    console.error('Study track error:', error);
    return res.status(500).json({ message: `Failed to track time: ${error.message}` });
  }
};

module.exports = {
  getProfile,
  trackStudyTime
};
