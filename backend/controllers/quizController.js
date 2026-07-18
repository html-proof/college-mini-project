const dbHelper = require('../services/dbService');
const GeminiService = require('../services/geminiService');

const gemini = new GeminiService();

// GENERATE QUIZ (With Database Persistence for Consistency)
const generateQuiz = async (req, res) => {
  const { subject } = req.body;
  if (!subject) {
    return res.status(400).json({ message: 'Subject is required!' });
  }

  const user = req.currentUser;

  try {
    const student = await dbHelper.get('SELECT * FROM students WHERE user_id = ?', [user.id]);
    const studentId = student ? student.student_id : null;
    const level = student ? student.learning_level : 'Beginner';

    // 1. Resolve Course and Lesson
    let course = await dbHelper.get('SELECT course_id FROM courses WHERE course_name = ?', [subject]);
    if (!course) {
      const result = await dbHelper.run('INSERT INTO courses (course_name, description) VALUES (?, ?)', [subject, `Adaptive course for ${subject}`]);
      course = { course_id: result.lastID };
    }

    let lesson = await dbHelper.get('SELECT lesson_id FROM lessons WHERE course_id = ? LIMIT 1', [course.course_id]);
    if (!lesson) {
      const result = await dbHelper.run('INSERT INTO lessons (course_id, title, content) VALUES (?, ?, ?)', [course.course_id, `Overview of ${subject}`, `AI-generated outline for ${subject}.`]);
      lesson = { lesson_id: result.lastID };
    }

    // 2. Check if a quiz already exists in the database for this lesson & level
    const dbQuiz = await dbHelper.get('SELECT quiz_id FROM quiz WHERE lesson_id = ? AND difficulty = ? LIMIT 1', [lesson.lesson_id, level]);
    if (dbQuiz) {
      const dbQuestions = await dbHelper.all('SELECT question, option_a, option_b, option_c, option_d, correct_answer FROM questions WHERE quiz_id = ?', [dbQuiz.quiz_id]);
      if (dbQuestions && dbQuestions.length > 0) {
        console.log(`Loading persistent ${level} quiz questions for subject: ${subject} from database.`);
        const questions = dbQuestions.map(q => ({
          question: q.question,
          options: [q.option_a, q.option_b, q.option_c, q.option_d],
          correct_answer: q.correct_answer
        }));
        return res.json({ questions });
      }
    }

    // 3. Get current average score to adapt Gemini difficulty
    let score = 0;
    if (studentId) {
      const progress = await dbHelper.get(`
        SELECT AVG(sp.score) as score 
        FROM student_progress sp
        JOIN lessons l ON sp.lesson_id = l.lesson_id
        WHERE sp.student_id = ? AND l.course_id = ?
      `, [studentId, course.course_id]);
      if (progress && progress.score !== null) {
        score = Math.round(progress.score);
      }
    }

    // 4. Generate new quiz via Gemini API
    console.log(`Generating new adaptive quiz for subject: ${subject} using Gemini.`);
    let questions = await gemini.generateQuiz(subject, score, level);

    // Fallback: If Gemini fails, query default questions from seed database (Quiz ID = 1-4)
    if (!questions || questions.length === 0 || (questions.length > 0 && questions[0].question.startsWith('Fallback:'))) {
      console.log('Gemini API offline or error. Fetching fallback quiz from seed database...');
      const dbQuestions = await dbHelper.all(`
        SELECT qe.question, qe.option_a, qe.option_b, qe.option_c, qe.option_d, qe.correct_answer
        FROM questions qe
        JOIN quiz q ON qe.quiz_id = q.quiz_id
        JOIN lessons l ON q.lesson_id = l.lesson_id
        JOIN courses c ON l.course_id = c.course_id
        WHERE c.course_name = ?
        LIMIT 5
      `, [subject]);

      if (dbQuestions && dbQuestions.length > 0) {
        questions = dbQuestions.map(q => ({
          question: q.question,
          options: [q.option_a, q.option_b, q.option_c, q.option_d],
          correct_answer: q.correct_answer
        }));
      }
    }

    // 5. Persist the generated quiz and questions to database for future consistency
    if (questions && questions.length > 0) {
      const quizResult = await dbHelper.run('INSERT INTO quiz (lesson_id, difficulty) VALUES (?, ?)', [lesson.lesson_id, level]);
      const quizId = quizResult.lastID;
      for (const q of questions) {
        await dbHelper.run(
          'INSERT INTO questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [quizId, q.question, q.options[0], q.options[1], q.options[2], q.options[3], q.correct_answer]
        );
      }
    }

    return res.json({ questions });

  } catch (error) {
    console.error('Quiz generation error:', error);
    return res.status(500).json({ message: `Failed to generate quiz: ${error.message}` });
  }
};

// SUBMIT QUIZ (With Backend Answer Verification & Explanations)
const submitQuiz = async (req, res) => {
  const { subject, answers, score: frontendScore, total_questions: frontendTotal } = req.body;
  if (!subject) {
    return res.status(400).json({ message: 'Subject is required!' });
  }

  const user = req.currentUser;

  try {
    const student = await dbHelper.get('SELECT * FROM students WHERE user_id = ?', [user.id]);
    if (!student) {
      return res.status(400).json({ message: 'Only registered students can submit quiz scores.' });
    }
    const studentId = student.student_id;

    // Resolve course and lesson
    const course = await dbHelper.get('SELECT course_id FROM courses WHERE course_name = ?', [subject]);
    if (!course) {
      return res.status(404).json({ message: 'Course not found for this subject.' });
    }
    const lesson = await dbHelper.get('SELECT lesson_id FROM lessons WHERE course_id = ? LIMIT 1', [course.course_id]);
    if (!lesson) {
      return res.status(404).json({ message: 'No lessons found for this subject.' });
    }

    // Get correct answers from the database
    // Get correct answers from the database for the current student's level
    const level = student.learning_level || 'Beginner';
    const dbQuiz = await dbHelper.get('SELECT quiz_id FROM quiz WHERE lesson_id = ? AND difficulty = ? LIMIT 1', [lesson.lesson_id, level]);
    let correctAnswers = [];
    if (dbQuiz) {
      correctAnswers = await dbHelper.all('SELECT question, correct_answer FROM questions WHERE quiz_id = ?', [dbQuiz.quiz_id]);
    }

    let calculatedScore = frontendScore !== undefined ? frontendScore : 0;
    let totalQuestions = frontendTotal || (correctAnswers.length > 0 ? correctAnswers.length : 5);
    let results = [];

    // Backend-driven answer checking
    if (answers && Array.isArray(answers) && correctAnswers.length > 0) {
      calculatedScore = 0;
      totalQuestions = correctAnswers.length;

      for (let i = 0; i < correctAnswers.length; i++) {
        const dbQ = correctAnswers[i];
        const userAnswer = answers[i] || '';
        const isCorrect = userAnswer === dbQ.correct_answer;
        
        if (isCorrect) {
          calculatedScore++;
        }

        results.push({
          question: dbQ.question,
          user_answer: userAnswer,
          correct_answer: dbQ.correct_answer,
          is_correct: isCorrect
        });
      }
    } else {
      // Fallback: If no answers sent or quiz questions not stored, rely on frontend scoring
      console.log('No answers array provided for validation. Falling back to frontend-provided score.');
    }

    const percentage = (calculatedScore / totalQuestions) * 100;

    // Get current progress or insert new
    const progress = await dbHelper.get('SELECT * FROM student_progress WHERE student_id = ? AND lesson_id = ?', [studentId, lesson.lesson_id]);
    
    let currentScore = 0;
    if (progress) {
      currentScore = progress.score;
    }

    // Adaptive concept mastery calculation
    let newScore = currentScore;
    if (calculatedScore >= 4) {
      newScore = Math.min(currentScore + 10, 100);
    } else if (calculatedScore === 3) {
      newScore = Math.min(currentScore + 3, 100);
    } else {
      newScore = Math.max(currentScore - 5, 0);
    }

    let newLevel = 'Beginner';
    if (newScore >= 75) {
      newLevel = 'Advanced';
    } else if (newScore >= 50) {
      newLevel = 'Intermediate';
    }

    if (progress) {
      await dbHelper.run(`
        UPDATE student_progress 
        SET score = ?, completion_percentage = 100.0, time_spent = time_spent + 0.25, last_updated = CURRENT_TIMESTAMP 
        WHERE student_id = ? AND lesson_id = ?
      `, [newScore, studentId, lesson.lesson_id]);
    } else {
      await dbHelper.run(`
        INSERT INTO student_progress (student_id, lesson_id, score, completion_percentage, time_spent)
        VALUES (?, ?, ?, 100.0, 0.25)
      `, [studentId, lesson.lesson_id, newScore]);
    }

    // Sync student general learning level
    await dbHelper.run('UPDATE students SET learning_level = ? WHERE student_id = ?', [newLevel, studentId]);

    return res.json({
      message: 'Quiz result submitted successfully!',
      score: calculatedScore,
      total: totalQuestions,
      percentage: Math.round(percentage),
      results: results,
      updated_mastery: {
        subject,
        old_score: currentScore,
        new_score: newScore,
        level: newLevel
      }
    });

  } catch (error) {
    console.error('Quiz submission error:', error);
    return res.status(500).json({ message: `Failed to submit quiz: ${error.message}` });
  }
};

module.exports = {
  generateQuiz,
  submitQuiz
};
