import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { 
  BookOpen, 
  Award, 
  Clock, 
  Brain, 
  MessageSquare, 
  FileText, 
  LogOut, 
  Send, 
  Sparkles, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Plus
} from 'lucide-react';

// Sub-component: Main Application after Auth
const TutorApp = () => {
  const { user, token, logout } = useAuth();
  
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data States
  const [profile, setProfile] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [recommendations, setRecommendations] = useState('');
  
  // Quiz States
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizSubject, setQuizSubject] = useState('');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  
  // Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  
  // Notes Upload States
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const [notesCategoryFilter, setNotesCategoryFilter] = useState('All');
  
  // UI Helpers
  const [alert, setAlert] = useState(null);
  const chatEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Load Dashboard Data
  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
      } else {
        showAlert('error', data.message || 'Failed to load profile');
      }
    } catch (err) {
      showAlert('error', 'Network error loading dashboard');
    }
  };

  // Load Materials List
  const loadMaterials = async () => {
    try {
      const res = await fetch('/api/materials/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMaterials(data.materials);
      }
    } catch (err) {
      console.error('Error loading materials', err);
    }
  };

  // Load Recommendations
  const loadRecommendations = async () => {
    try {
      const res = await fetch('/api/materials/recommend', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error('Error loading recommendations', err);
    }
  };

  // Load Chat History
  const loadChatHistory = async () => {
    try {
      const res = await fetch('/api/tutor/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(data.history);
      }
    } catch (err) {
      console.error('Error loading chat history', err);
    }
  };

  // Initial Data Loads
  useEffect(() => {
    if (token) {
      loadDashboard();
      loadMaterials();
      loadChatHistory();
      loadRecommendations();
    }
  }, [token]);

  // Fetch recommendations whenever mastery updates
  useEffect(() => {
    if (activeTab === 'materials') {
      loadRecommendations();
    }
  }, [activeTab]);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Quiz Engine Handlers
  const startQuiz = async (subject) => {
    setQuizLoading(true);
    setQuizSubject(subject);
    setQuizResult(null);
    setQuizAnswers([]);
    setCurrentQuestionIdx(0);
    setSelectedAnswer('');
    
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ subject })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveQuiz(data.questions);
      } else {
        showAlert('error', data.message || 'Failed to generate quiz');
      }
    } catch (err) {
      showAlert('error', 'Network error starting quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (!selectedAnswer) return;
    
    const updatedAnswers = [...quizAnswers, selectedAnswer];
    setQuizAnswers(updatedAnswers);
    setSelectedAnswer('');
    
    if (currentQuestionIdx + 1 < activeQuiz.length) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      submitQuiz(updatedAnswers);
    }
  };

  const submitQuiz = async (answers) => {
    setQuizLoading(true);
    
    // Calculate correct score
    let correctCount = 0;
    activeQuiz.forEach((q, idx) => {
      if (answers[idx] === q.correct_answer) {
        correctCount++;
      }
    });

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: quizSubject,
          score: correctCount,
          total_questions: activeQuiz.length,
          answers: answers
        })
      });
      const data = await res.json();
      if (res.ok) {
        setQuizResult(data);
        loadDashboard(); // Refresh stats
        if (correctCount >= 4) {
          triggerConfetti();
        }
      } else {
        showAlert('error', data.message || 'Failed to submit quiz results');
      }
    } catch (err) {
      showAlert('error', 'Network error submitting quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  // Chat Tutoring Handlers
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    
    const message = chatInput;
    setChatInput('');
    setChatLoading(true);
    
    // Append user message immediately locally
    const localUserMsg = { sender: 'user', message, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, localUserMsg]);
    
    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          note_id: selectedNoteId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { sender: 'ai', message: data.reply, timestamp: data.timestamp }]);
        loadDashboard(); // Study active time updates
      } else {
        showAlert('error', data.message || 'Failed to get chat response');
      }
    } catch (err) {
      showAlert('error', 'Network error during chat');
    } finally {
      setChatLoading(false);
    }
  };

  // Note Upload Handler
  const handleUploadNote = async (e) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) {
      showAlert('error', 'Title and content are required!');
      return;
    }
    
    setUploadLoading(true);
    try {
      const res = await fetch('/api/materials/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent
        })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('success', 'Study notes uploaded successfully!');
        setNoteTitle('');
        setNoteContent('');
        loadMaterials();
        loadRecommendations(); // Mastery recommendations change
      } else {
        showAlert('error', data.message || 'Failed to upload notes');
      }
    } catch (err) {
      showAlert('error', 'Network error uploading notes');
    } finally {
      setUploadLoading(false);
    }
  };

  // Chat Quiz Trigger from notes
  const handleTestMeOnNote = async (note) => {
    setSelectedNoteId(note.id);
    setActiveTab('tutor');
    setActiveQuiz(null);
    setChatLoading(true);
    
    const message = `Please quiz me on my study note: "${note.title}".`;
    const localUserMsg = { sender: 'user', message, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, localUserMsg]);
    
    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          note_id: note.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { sender: 'ai', message: data.reply, timestamp: data.timestamp }]);
        loadDashboard();
      } else {
        showAlert('error', data.message || 'Failed to get chat response');
      }
    } catch (err) {
      showAlert('error', 'Network error during chat');
    } finally {
      setChatLoading(false);
    }
  };

  // Confetti trigger
  const triggerConfetti = () => {
    const pieces = [];
    const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    for (let i = 0; i < 60; i++) {
      pieces.push({
        id: i,
        left: `${Math.random() * 100}%`,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        animationDelay: `${Math.random() * 1.5}s`,
        animationDuration: `${2 + Math.random() * 1.5}s`,
        transform: `scale(${0.5 + Math.random() * 0.8})`
      });
    }
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 5000);
  };

  // Helper for rendering Chat markdown blocks (basic parser)
  const formatTutorMessage = (text) => {
    if (!text) return '';
    
    // Convert code blocks
    let formattedText = text.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });

    // Convert inline code
    formattedText = formattedText.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert bullet points
    formattedText = formattedText.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
    formattedText = formattedText.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

    // Convert bold text
    formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Convert line breaks
    formattedText = formattedText.replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: formattedText }} />;
  };

  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Average concept mastery
  const getAverageMastery = () => {
    if (!profile || !profile.mastery.length) return 0;
    const total = profile.mastery.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total / profile.mastery.length);
  };

  const filteredMaterials = materials.filter(note => {
    if (notesCategoryFilter === 'All') return true;
    const titleLower = note.title.toLowerCase();
    const contentLower = note.content.toLowerCase();
    let badge = 'General';
    if (titleLower.includes('python') || contentLower.includes('python')) badge = 'Python';
    else if (titleLower.includes('web') || titleLower.includes('html') || titleLower.includes('css') || titleLower.includes('javascript') || contentLower.includes('javascript')) badge = 'Web Dev';
    else if (titleLower.includes('ai') || titleLower.includes('machine') || titleLower.includes('neural') || contentLower.includes('neural')) badge = 'AI / ML';
    else if (titleLower.includes('science') || titleLower.includes('biology') || titleLower.includes('chemistry') || titleLower.includes('physics')) badge = 'Science';
    return badge === notesCategoryFilter;
  });

  return (
    <div className="app-container">
      {/* Premium Floating Header */}
      <header className="navbar">
        <div className="nav-brand">
          <Brain size={28} className="text-primary" />
          <span>Personalized Tutor System</span>
        </div>
        <nav className="nav-links">
          <button 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setActiveQuiz(null); }}
          >
            Dashboard
          </button>
          <button 
            className={`nav-btn ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => { setActiveTab('quiz'); }}
          >
            Adaptive Quiz
          </button>
          <button 
            className={`nav-btn ${activeTab === 'tutor' ? 'active' : ''}`}
            onClick={() => { setActiveTab('tutor'); setActiveQuiz(null); }}
          >
            AI Tutor Chat
          </button>
          <button 
            className={`nav-btn ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => { setActiveTab('materials'); setActiveQuiz(null); }}
          >
            Study Notes
          </button>
          {user && (
            <div className="nav-user-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '10px', marginRight: '10px' }}>
              {user.profile_image ? (
                <img src={user.profile_image} alt="Avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-primary)' }} />
              ) : (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>
                  {user.full_name ? user.full_name[0].toUpperCase() : user.username[0].toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.full_name || user.username}</span>
            </div>
          )}
          <button className="nav-btn nav-logout" onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </nav>
      </header>

      {/* Main Panel Content Container */}
      <main className="main-content">
        {alert && (
          <div className={`alert-box ${alert.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {alert.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              <span>{alert.message}</span>
            </div>
          </div>
        )}

        {/* ----------------- TAB: DASHBOARD ----------------- */}
        {activeTab === 'dashboard' && profile && (
          <div className="tab-container active">
            <div className="dashboard-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px' }}>
              {profile.profile_image ? (
                <img 
                  src={profile.profile_image} 
                  alt="Profile" 
                  style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} 
                />
              ) : (
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: '#fff', fontWeight: 'bold' }}>
                  {profile.full_name ? profile.full_name[0].toUpperCase() : profile.username[0].toUpperCase()}
                </div>
              )}
              <div>
                <h1 style={{ margin: 0 }}>Welcome Back, {profile.full_name || profile.username}!</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Track your progress and Concept Mastery in real-time.</p>
              </div>
            </div>

            <div className="metrics-container">
              <div className="metric-box glass-panel">
                <Award size={36} style={{ color: 'var(--color-primary)', margin: '0 auto' }} />
                <div style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Overall Mastery</div>
                <div className="metric-value">{getAverageMastery()}%</div>
              </div>
              <div className="metric-box glass-panel">
                <Clock size={36} style={{ color: 'var(--color-accent)', margin: '0 auto' }} />
                <div style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Hours Studied</div>
                <div className="metric-value">{profile.metrics.hours_studied} hrs</div>
              </div>
              <div className="metric-box glass-panel">
                <Brain size={36} style={{ color: 'var(--color-secondary)', margin: '0 auto' }} />
                <div style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Quizzes Done</div>
                <div className="metric-value">{profile.metrics.quizzes_completed}</div>
              </div>
            </div>

            <div className="dashboard-grid">
              {/* Concept Mastery Progress Bars */}
              <div className="widget-card glass-panel">
                <h2 className="widget-title">
                  <Brain size={22} style={{ color: 'var(--color-primary)' }} />
                  Concept Mastery Metrics
                </h2>
                <div className="concept-mastery-list">
                  {profile.mastery.map((item, idx) => (
                    <div key={idx} className="concept-item">
                      <div className="concept-info">
                        <span style={{ fontWeight: 600 }}>{item.subject}</span>
                        <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                          {item.level} ({item.score}%)
                        </span>
                      </div>
                      <div className="concept-bar">
                        <div className="concept-fill" style={{ width: `${item.score}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Quizzes Side Widget */}
              <div className="widget-card glass-panel">
                <h2 className="widget-title">
                  <Award size={22} style={{ color: 'var(--color-secondary)' }} />
                  Recent Quizzes
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {profile.recent_quizzes.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>No quizzes completed yet.</p>
                  ) : (
                    profile.recent_quizzes.map((quiz, idx) => (
                      <div key={idx} style={{ padding: '12px', borderBottom: '1px solid var(--border-glass)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.95rem' }}>
                          <span>{quiz.subject}</span>
                          <span style={{ color: quiz.percentage >= 60 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                            {quiz.score}/{quiz.total_questions}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <span>Percentage: {quiz.percentage}%</span>
                          <span>{new Date(quiz.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: ADAPTIVE QUIZ ----------------- */}
        {activeTab === 'quiz' && (
          <div className="tab-container active">
            {quizLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0' }}>
                <Sparkles size={48} className="text-primary animate-pulse" style={{ animation: 'spin 2s linear infinite' }} />
                <h3 style={{ marginTop: '20px' }}>Generating your adaptive quiz using Gemini...</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Designing questions tailored to your concept mastery levels.</p>
              </div>
            )}

            {!activeQuiz && !quizLoading && (
              <div className="quiz-container glass-panel" style={{ maxWidth: '900px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Adaptive Quiz Engine</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '30px' }}>
                  Select a topic to start. Gemini will adapt question difficulty dynamically based on your current concept mastery.
                </p>
                <div className="subject-selector">
                  {profile && profile.mastery.map((item, idx) => (
                    <div key={idx} className="subject-card glass-panel" onClick={() => startQuiz(item.subject)}>
                      <HelpCircle size={32} style={{ color: 'var(--color-primary)', margin: '0 auto 10px' }} />
                      <h3>{item.subject}</h3>
                      <div className="mastery-tag">{item.level} ({item.score}%)</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeQuiz && !quizResult && !quizLoading && (
              <div className="quiz-container glass-panel">
                <div className="quiz-header">
                  <span style={{ fontWeight: 600 }}>Topic: {quizSubject}</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    Question {currentQuestionIdx + 1} of {activeQuiz.length}
                  </span>
                </div>
                
                <div className="quiz-progress-bar">
                  <div className="quiz-progress-fill" style={{ width: `${((currentQuestionIdx + 1) / activeQuiz.length) * 100}%` }}></div>
                </div>

                <div className="question-text">
                  {activeQuiz[currentQuestionIdx].question}
                </div>

                <div className="options-list">
                  {activeQuiz[currentQuestionIdx].options.map((opt, idx) => (
                    <button
                      key={idx}
                      className={`option-btn ${selectedAnswer === opt ? 'selected' : ''}`}
                      onClick={() => setSelectedAnswer(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn-primary" 
                    onClick={handleNextQuestion}
                    disabled={!selectedAnswer}
                  >
                    {currentQuestionIdx + 1 === activeQuiz.length ? 'Submit Quiz' : 'Next Question'}
                  </button>
                </div>
              </div>
            )}

            {quizResult && !quizLoading && (
              <div className="quiz-container glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
                <Award size={64} style={{ color: 'var(--color-warning)', margin: '0 auto 20px' }} />
                <h2>Quiz Completed!</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '30px' }}>
                  You scored <strong>{quizResult.score}</strong> out of <strong>{quizResult.total}</strong> ({quizResult.percentage}%)
                </p>

                <div className="glass-panel" style={{ padding: '20px', maxWidth: '400px', margin: '0 auto 30px', textAlign: 'left' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', color: 'var(--color-accent)' }}>Adaptive Mastery Impact:</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Subject:</span>
                    <strong>{quizResult.updated_mastery.subject}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Score Change:</span>
                    <strong>{quizResult.updated_mastery.old_score}% → {quizResult.updated_mastery.new_score}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tutoring Level:</span>
                    <strong style={{ color: 'var(--color-primary)' }}>{quizResult.updated_mastery.level}</strong>
                  </div>
                </div>

                {quizResult.results && quizResult.results.length > 0 && (
                  <div style={{ textAlign: 'left', maxWidth: '600px', margin: '30px auto', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--text-primary)', fontWeight: 600 }}>Review Your Answers</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {quizResult.results.map((r, idx) => (
                        <div key={idx} className="glass-panel" style={{ padding: '15px', borderLeft: `4px solid ${r.is_correct ? 'var(--color-success)' : 'var(--color-warning)'}` }}>
                          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Q{idx + 1}: {r.question}</p>
                          <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ color: r.is_correct ? 'var(--color-success)' : 'var(--color-warning)' }}>
                              <strong>Your Answer:</strong> {r.user_answer} {r.is_correct ? '✓' : '✗'}
                            </div>
                            {!r.is_correct && (
                              <div style={{ color: 'var(--color-success)' }}>
                                <strong>Correct Answer:</strong> {r.correct_answer}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button className="btn-primary" onClick={() => setActiveQuiz(null)}>
                  Return to Quiz Board
                </button>
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB: AI TUTOR CHAT ----------------- */}
        {activeTab === 'tutor' && (
          <div className="tab-container active">
            <div className="chat-container glass-panel">
              {/* Sidebar study notes selector */}
              <div className="notes-sidebar" style={{ borderRight: '1px solid var(--border-glass)' }}>
                <h3 className="widget-title">
                  <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                  Inject Study Notes
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Select a study sheet below to provide immediate background context to your AI Tutor.
                </p>
                <div className="notes-list">
                  {materials.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      No study notes uploaded. Go to "Study Notes" tab to add some!
                    </div>
                  ) : (
                    materials.map((note) => (
                      <div 
                        key={note.id} 
                        className={`note-item ${selectedNoteId === note.id ? 'active' : ''}`}
                        onClick={() => setSelectedNoteId(prev => prev === note.id ? null : note.id)}
                      >
                        <h4>{note.title}</h4>
                        <p>{note.content.substring(0, 40)}...</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Chat workspace */}
              <div className="chat-workspace">
                <div className="chat-header">
                  <div>
                    <h3 style={{ fontSize: '1.1rem' }}>AI Tutor Session</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {selectedNoteId ? "📄 Active Study Note context injected" : "🎓 General Concept tutoring active"}
                    </span>
                  </div>
                  <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
                </div>

                <div className="chat-history-box">
                  {chatMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '400px' }}>
                      <Brain size={48} style={{ color: 'var(--color-primary)', opacity: 0.5, margin: '0 auto 16px' }} />
                      <h3>Ask your Virtual AI Tutor</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>
                        Type any questions about Python, Web Development, Docker, database designs, or request explanations of difficult concepts.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className={`chat-msg ${msg.sender}`}>
                        {formatTutorMessage(msg.message)}
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="chat-msg ai" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                      <span>Tutor is thinking...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form className="chat-input-area" onSubmit={handleSendChat}>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Ask a question..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '12px 20px' }} disabled={chatLoading}>
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: STUDY NOTES & RECS ----------------- */}
        {activeTab === 'materials' && (
          <div className="tab-container active">
            <div className="dashboard-grid">
              
              {/* Left Column: Recommendation & Notes Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Dynamic Recommendations Board */}
                <div className="widget-card glass-panel">
                  <h2 className="widget-title">
                    <Sparkles size={22} style={{ color: 'var(--color-primary)' }} />
                    AI Concept Recommendations
                  </h2>
                  <div className="recommendations-box">
                    {recommendations ? (
                      formatTutorMessage(recommendations)
                    ) : (
                      <p style={{ color: 'var(--text-secondary)' }}>Analyzing mastery scores to generate customized tutoring suggestions...</p>
                    )}
                  </div>
                </div>

                {/* Upload Study Notes Form */}
                <div className="widget-card glass-panel">
                  <h2 className="widget-title">
                    <Upload size={22} style={{ color: 'var(--color-accent)' }} />
                    Upload Study Notes
                  </h2>
                  <form onSubmit={handleUploadNote}>
                    <div className="form-group">
                      <label>Note Title</label>
                      <input 
                        type="text" 
                        className="input-control" 
                        placeholder="e.g. Python List Comprehensions"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Text Content / Cheat Sheet Data</label>
                      <textarea 
                        className="input-control" 
                        rows={6}
                        placeholder="Paste study materials, code snippets, or concept summaries here. Your AI tutor will read this to guide your lessons."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    <button type="submit" className="btn-primary" disabled={uploadLoading}>
                      <Plus size={16} />
                      {uploadLoading ? 'Saving...' : 'Add Note to Tutor'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Uploaded List */}
              <div className="widget-card glass-panel">
                <h2 className="widget-title">
                  <FileText size={22} style={{ color: 'var(--color-secondary)' }} />
                  My Uploaded Materials
                </h2>
                
                {/* Category Filter Pills */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {['All', 'Python', 'Web Dev', 'AI / ML', 'Science', 'General'].map(cat => (
                    <button
                      key={cat}
                      className={`nav-btn ${notesCategoryFilter === cat ? 'active' : ''}`}
                      onClick={() => setNotesCategoryFilter(cat)}
                      style={{ 
                        padding: '4px 10px', 
                        fontSize: '0.75rem', 
                        borderRadius: '16px', 
                        minWidth: 'auto', 
                        border: notesCategoryFilter === cat ? '1px solid var(--color-primary)' : '1px solid var(--border-glass)',
                        backgroundColor: notesCategoryFilter === cat ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.02)'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {filteredMaterials.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0' }}>
                      No study sheets found in this category.
                    </p>
                  ) : (
                    filteredMaterials.map((note) => {
                      const isExpanded = expandedNoteId === note.id;
                      
                      // Subject detection helper
                      const titleLower = note.title.toLowerCase();
                      const contentLower = note.content.toLowerCase();
                      let badge = 'General';
                      let badgeColor = '#94a3b8';
                      let badgeBg = 'rgba(148, 163, 184, 0.1)';
                      
                      if (titleLower.includes('python') || contentLower.includes('python')) {
                        badge = 'Python';
                        badgeColor = '#38bdf8';
                        badgeBg = 'rgba(56, 189, 248, 0.15)';
                      } else if (titleLower.includes('web') || titleLower.includes('html') || titleLower.includes('css') || titleLower.includes('javascript') || contentLower.includes('javascript')) {
                        badge = 'Web Dev';
                        badgeColor = '#fb923c';
                        badgeBg = 'rgba(251, 146, 60, 0.15)';
                      } else if (titleLower.includes('ai') || titleLower.includes('machine') || titleLower.includes('neural') || contentLower.includes('neural')) {
                        badge = 'AI / ML';
                        badgeColor = '#4ade80';
                        badgeBg = 'rgba(74, 222, 128, 0.15)';
                      } else if (titleLower.includes('science') || titleLower.includes('biology') || titleLower.includes('chemistry') || titleLower.includes('physics')) {
                        badge = 'Science';
                        badgeColor = '#60a5fa';
                        badgeBg = 'rgba(96, 165, 250, 0.15)';
                      }

                      return (
                        <div 
                          key={note.id} 
                          className="glass-panel" 
                          style={{ 
                            padding: '18px', 
                            border: '1px solid var(--border-glass)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '12px',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isExpanded ? '0 12px 20px -8px rgba(0,0,0,0.4)' : 'none',
                            transform: isExpanded ? 'translateY(-2px)' : 'none',
                            background: isExpanded ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{note.title}</h4>
                            <span 
                              style={{ 
                                fontSize: '0.7rem', 
                                fontWeight: 600, 
                                padding: '3px 8px', 
                                borderRadius: '12px', 
                                color: badgeColor, 
                                backgroundColor: badgeBg,
                                border: `1px solid ${badgeColor}22`,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}
                            >
                              {badge}
                            </span>
                          </div>
                          
                          <p style={{ 
                            fontSize: '0.85rem', 
                            color: 'var(--text-secondary)', 
                            lineHeight: 1.5,
                            whiteSpace: isExpanded ? 'pre-line' : 'nowrap',
                            overflow: isExpanded ? 'visible' : 'hidden',
                            textOverflow: isExpanded ? 'clip' : 'ellipsis',
                            maxHeight: isExpanded ? 'none' : '40px',
                            margin: 0
                          }}>
                            {note.content}
                          </p>

                          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                            <button 
                              className="btn-secondary" 
                              onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                            >
                              {isExpanded ? 'Collapse' : 'Read Note'}
                            </button>
                            <button 
                              className="btn-primary" 
                              onClick={() => handleTestMeOnNote(note)}
                              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Sparkles size={12} />
                              Test Me!
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {confetti.length > 0 && (
        <div className="confetti-container">
          {confetti.map(piece => (
            <div 
              key={piece.id} 
              className="confetti-piece" 
              style={{
                left: piece.left,
                backgroundColor: piece.backgroundColor,
                animationDelay: piece.animationDelay,
                animationDuration: piece.animationDuration,
                transform: piece.transform
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Sub-component: Login/Registration UI
const AuthGateway = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  
  // Inputs
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (mode === 'register' && (!username || !fullName))) {
      showAlert('error', 'All fields are required!');
      return;
    }
    
    setLoading(true);
    if (mode === 'login') {
      const res = await login(email, password);
      if (!res.success) {
        showAlert('error', res.error);
      }
    } else {
      const res = await register(fullName, username, email, password, profileImage);
      if (res.success) {
        showAlert('success', 'Registration successful! You can now log in.');
        setMode('login');
        setPassword('');
        setFullName('');
        setUsername('');
        setProfileImage(null);
        setProfilePreview('');
      } else {
        showAlert('error', res.error);
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <Brain size={44} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1>{mode === 'login' ? 'Tutor Platform' : 'Create Account'}</h1>
          <p>{mode === 'login' ? 'Sign in to access your adaptive tutor' : 'Start your personalized learning path'}</p>
        </div>

        {alert && (
          <div className={`alert-box ${alert.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {alert.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              <span>{alert.message}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  className="input-control" 
                  placeholder="John Doe" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  className="input-control" 
                  placeholder="johndoe" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Profile Picture</label>
                <div className="profile-upload-container" style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                  <input 
                    type="file" 
                    id="profile-upload-input"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="profile-upload-input" className="profile-upload-label" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '90px', height: '90px', borderRadius: '50%', border: '2px dashed var(--color-primary)', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                    {profilePreview ? (
                      <img src={profilePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className="profile-upload-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        <Upload size={20} style={{ color: 'var(--color-primary)', marginBottom: '4px' }} />
                        <span>Upload</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </>
          )}
          
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="input-control" 
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="input-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'login' ? (
            <p>Don't have an account? <span onClick={() => { setMode('register'); setAlert(null); }}>Sign Up</span></p>
          ) : (
            <p>Already have an account? <span onClick={() => { setMode('login'); setAlert(null); }}>Login</span></p>
          )}
        </div>
      </div>
    </div>
  );
};

// Root Component wrapping inner with Auth
const AppContent = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <Brain size={48} style={{ color: 'var(--color-primary)', animation: 'pulse 1.5s infinite' }} />
      </div>
    );
  }
  
  return user ? <TutorApp /> : <AuthGateway />;
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
