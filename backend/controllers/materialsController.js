const fs = require('fs');
const dbHelper = require('../services/dbService');
const GeminiService = require('../services/geminiService');

const gemini = new GeminiService();

// RECOMMEND MATERIALS
const recommendMaterials = async (req, res) => {
  const user = req.currentUser;

  try {
    const student = await dbHelper.get('SELECT * FROM students WHERE user_id = ?', [user.id]);
    if (!student) {
      return res.json({ recommendations: 'Register as a student to view personalized AI study recommendations.' });
    }

    const studentId = student.student_id;

    // Fetch student concept mastery
    const masteryList = await dbHelper.all(`
      SELECT 
        c.course_name as subject,
        COALESCE(CAST(AVG(sp.score) AS INTEGER), 0) as score
      FROM courses c
      LEFT JOIN lessons l ON c.course_id = l.course_id
      LEFT JOIN student_progress sp ON l.lesson_id = sp.lesson_id AND sp.student_id = ?
      GROUP BY c.course_name
    `, [studentId]);

    const formattedMastery = masteryList.map(m => {
      const score = m.score !== undefined && m.score !== null ? m.score : 0;
      let level = 'Beginner';
      if (score >= 75) level = 'Advanced';
      else if (score >= 50) level = 'Intermediate';
      return { subject: m.subject, score, level };
    });

    const userProfile = {
      username: user.email.split('@')[0],
      mastery: formattedMastery
    };

    // Filter weak subjects (score < 60)
    let weakSubjects = formattedMastery.filter(m => m.score < 60).map(m => m.subject);
    if (weakSubjects.length === 0 && formattedMastery.length > 0) {
      const lowest = formattedMastery.reduce((prev, curr) => prev.score < curr.score ? prev : curr);
      weakSubjects = [lowest.subject];
    }

    const recommendationsMd = await gemini.generateRecommendations(userProfile, weakSubjects);
    return res.json({ recommendations: recommendationsMd });

  } catch (error) {
    console.error('Recommendations error:', error);
    return res.status(500).json({ message: `Failed to load recommendations: ${error.message}` });
  }
};

// UPLOAD MATERIAL
const uploadMaterial = async (req, res) => {
  const user = req.currentUser;
  let title = req.body.title;
  let content = req.body.content;

  if (req.file) {
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      content = fileBuffer.toString('utf-8');
      title = title || req.file.originalname;
      // Remove temporary uploaded file
      fs.unlinkSync(req.file.path);
    } catch (error) {
      return res.status(400).json({ message: `Could not read file text: ${error.message}` });
    }
  }

  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required!' });
  }

  try {
    const result = await dbHelper.run(
      'INSERT INTO study_materials (user_id, title, content) VALUES (?, ?, ?)',
      [user.id, title, content]
    );

    return res.status(201).json({
      message: 'Study notes uploaded successfully!',
      note: {
        id: result.lastID,
        title,
        content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Materials upload error:', error);
    return res.status(500).json({ message: `Failed to save study notes: ${error.message}` });
  }
};

// LIST MATERIALS
const listMaterials = async (req, res) => {
  const user = req.currentUser;

  try {
    const materials = await dbHelper.all('SELECT * FROM study_materials WHERE user_id = ? ORDER BY timestamp DESC', [user.id]);
    return res.json({
      materials: materials.map(m => ({
        id: m.id,
        title: m.title,
        content: m.content.substring(0, 200) + (m.content.length > 200 ? '...' : ''),
        timestamp: m.timestamp
      }))
    });
  } catch (error) {
    console.error('Materials list fetch error:', error);
    return res.status(500).json({ message: `Failed to list study materials: ${error.message}` });
  }
};

module.exports = {
  recommendMaterials,
  uploadMaterial,
  listMaterials
};
