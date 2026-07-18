const dbHelper = require('../services/dbService');
const GeminiService = require('../services/geminiService');

const gemini = new GeminiService();

// SEND TUTOR CHAT MESSAGE
const sendChatMessage = async (req, res) => {
  const { message, note_id } = req.body;
  if (!message) {
    return res.status(400).json({ message: 'Message is required!' });
  }

  const user = req.currentUser;

  try {
    const student = await dbHelper.get('SELECT * FROM students WHERE user_id = ?', [user.id]);
    if (!student) {
      return res.status(400).json({ message: 'Only registered students can access the tutor chatbot.' });
    }
    const studentId = student.student_id;

    // Load recent chat history and format it to user/ai message lists
    const chatRows = await dbHelper.all('SELECT question, answer, timestamp FROM chat_history WHERE student_id = ? ORDER BY timestamp ASC', [studentId]);
    const history = [];
    for (const row of chatRows) {
      history.push({ message: row.question, sender: 'user', timestamp: row.timestamp });
      history.push({ message: row.answer, sender: 'ai', timestamp: row.timestamp });
    }

    // Load user profile context
    const masteryList = await dbHelper.all(`
      SELECT 
        c.course_name as subject,
        COALESCE(CAST(AVG(sp.score) AS INTEGER), 0) as score
      FROM courses c
      LEFT JOIN lessons l ON c.course_id = l.course_id
      LEFT JOIN student_progress sp ON l.lesson_id = sp.lesson_id AND sp.student_id = ?
      GROUP BY c.course_name
    `, [studentId]);

    const userProfile = {
      username: user.email.split('@')[0],
      mastery: masteryList.map(m => {
        const score = m.score !== undefined && m.score !== null ? m.score : 0;
        let level = 'Beginner';
        if (score >= 75) level = 'Advanced';
        else if (score >= 50) level = 'Intermediate';
        return { subject: m.subject, score, level };
      })
    };

    // Load notes context if note_id is supplied
    let notesContext = null;
    if (note_id) {
      const note = await dbHelper.get('SELECT * FROM study_materials WHERE id = ? AND user_id = ?', [note_id, user.id]);
      if (note) {
        notesContext = note.content;
      }
    }

    // Fetch response from Gemini
    const responseText = await gemini.getTutorResponse(message, history, userProfile, notesContext);

    // Save Q&A pair to chat_history
    const insertResult = await dbHelper.run(
      'INSERT INTO chat_history (student_id, question, answer) VALUES (?, ?, ?)',
      [studentId, message, responseText]
    );

    // Increment study metrics hours in student_progress (for the last active lesson)
    const activeProgress = await dbHelper.get('SELECT lesson_id FROM student_progress WHERE student_id = ? ORDER BY last_updated DESC LIMIT 1', [studentId]);
    if (activeProgress) {
      await dbHelper.run(
        'UPDATE student_progress SET time_spent = time_spent + 0.1, last_updated = CURRENT_TIMESTAMP WHERE student_id = ? AND lesson_id = ?',
        [studentId, activeProgress.lesson_id]
      );
    }

    return res.json({
      reply: responseText,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ message: `Failed to process chat: ${error.message}` });
  }
};

// GET CHAT HISTORY
const getChatHistory = async (req, res) => {
  const user = req.currentUser;

  try {
    const student = await dbHelper.get('SELECT student_id FROM students WHERE user_id = ?', [user.id]);
    if (!student) {
      return res.json({ history: [] });
    }

    const chatRows = await dbHelper.all('SELECT question, answer, timestamp FROM chat_history WHERE student_id = ? ORDER BY timestamp ASC', [student.student_id]);
    const history = [];
    for (const row of chatRows) {
      history.push({ message: row.question, sender: 'user', timestamp: row.timestamp });
      history.push({ message: row.answer, sender: 'ai', timestamp: row.timestamp });
    }

    return res.json({ history });
  } catch (error) {
    console.error('Chat history fetch error:', error);
    return res.status(500).json({ message: `Failed to load chat history: ${error.message}` });
  }
};

module.exports = {
  sendChatMessage,
  getChatHistory
};
