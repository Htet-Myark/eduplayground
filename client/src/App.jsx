import { useEffect, useMemo, useState } from 'react';

const API_URL = 'http://localhost:5000';

function App() {
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/exams`)
      .then((res) => res.json())
      .then((data) => setExams(data.exams || []));
  }, []);

  const score = useMemo(() => {
    if (!result) return 0;
    return result.correct;
  }, [result]);

  const fetchRecords = async (userId) => {
    const response = await fetch(`${API_URL}/api/users/${userId}/records`);
    const data = await response.json();
    if (response.ok) {
      setRecords(data.records || []);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchRecords(user.id);
    }
  }, [user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = mode === 'login' ? '/api/login' : '/api/register';
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mode === 'login' ? { email: form.email, password: form.password } : form),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Unable to complete request');
      return;
    }

    setUser(data.user);
  };

  const startExam = async (examId) => {
    setSelectedExam(examId);
    setCurrentQuestion(0);
    setAnswers([]);
    setResult(null);
    const response = await fetch(`${API_URL}/api/exams/${examId}/questions`);
    const data = await response.json();
    setQuestions(data.questions || []);
  };

  const selectAnswer = (index) => {
    const next = [...answers];
    next[currentQuestion] = index;
    setAnswers(next);
  };

  const submitExam = async () => {
    const correct = questions.reduce((count, question, index) => count + (answers[index] === question.answer ? 1 : 0), 0);
    const percentage = Math.round((correct / questions.length) * 100);
    const review = questions.map((question, index) => ({
      ...question,
      selectedAnswer: answers[index],
      isCorrect: answers[index] === question.answer,
    }));

    const response = await fetch(`${API_URL}/api/exams/${selectedExam}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, score: correct, total: questions.length, percentage, review }),
    });

    if (response.ok) {
      const data = await response.json();
      setRecords(data.records || []);
    }

    setResult({
      correct,
      total: questions.length,
      percentage,
      review,
    });
  };

  if (!user) {
    return (
      <div className="app-shell">
        <header className="hero">
          <p className="eyebrow">Creative Apps • AI-Powered Education</p>
          <h1>AI-Powered Education Exam Platform</h1>
          <p>Practice, reason, and learn with grounded exam questions for cloud and container certifications.</p>
        </header>
        <main className="auth-grid">
          <section className="card">
            <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="form-group">
                  <label>Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
              )}
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <button className="primary-btn" type="submit">{mode === 'login' ? 'Log in' : 'Register'}</button>
            </form>
            <p className="switch-link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}
            </p>
            {error && <p className="error">{error}</p>}
          </section>
          <section className="card side-card">
            <h3>Contest-ready features</h3>
            <ul>
              <li>4 certification tracks: AWS, Azure, Kubernetes, Docker</li>
              <li>Login backed by Neon-compatible PostgreSQL</li>
              <li>Grounded explanations and exam review flow</li>
              <li>Designed for the Agents League Creative Apps track</li>
            </ul>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero compact">
        <div>
          <p className="eyebrow">Creative Apps • Microsoft IQ-inspired</p>
          <h1>Welcome, {user.name}</h1>
          <p>Choose an exam and begin practicing with AI-informed, grounded questions.</p>
        </div>
        <button className="secondary-btn" onClick={() => { setUser(null); setRecords([]); }}>Log out</button>
      </header>
      {!selectedExam ? (
        <section className="card">
          <h2>Dashboard</h2>
          <p className="small">Track your exam history, scores, and review progress in one place.</p>
          <div className="history-list">
            {records.length === 0 ? (
              <p className="small">No attempts yet. Start an exam to build your progress history.</p>
            ) : records.map((record) => (
              <div key={record.id} className="history-item">
                <div>
                  <h3>{record.examId.toUpperCase()}</h3>
                  <p className="small">{new Date(record.completedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="score-pill">{record.score}/{record.total}</p>
                  <p className="small">{record.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
          <h3 style={{ marginTop: '20px' }}>Choose an exam</h3>
          <div className="exam-grid">
            {exams.map((exam) => (
              <div key={exam.id} className="exam-card">
                <h3>{exam.title}</h3>
                <p>{exam.description}</p>
                <p className="small">{exam.id === 'kids' ? '10 questions • fun riddles for kids' : '50 questions • full review after submission'}</p>
                <button className="primary-btn" onClick={() => startExam(exam.id)}>Start exam</button>
              </div>
            ))}
          </div>
        </section>
      ) : !result && questions.length > 0 ? (
        <section className="card">
          <div className="exam-topbar">
            <div>
              <p className="eyebrow">{selectedExam.toUpperCase()}</p>
              <h2>{questions[currentQuestion].prompt}</h2>
            </div>
            <p>{currentQuestion + 1}/{questions.length}</p>
          </div>
          <div className="options">
            {questions[currentQuestion].options.map((option, index) => (
              <button key={option} className={`option-btn ${answers[currentQuestion] === index ? 'selected' : ''}`} onClick={() => selectAnswer(index)}>
                {option}
              </button>
            ))}
          </div>
          <div className="actions">
            <button className="secondary-btn" disabled={currentQuestion === 0} onClick={() => setCurrentQuestion((prev) => prev - 1)}>Previous</button>
            {currentQuestion < questions.length - 1 ? (
              <button className="primary-btn" onClick={() => setCurrentQuestion((prev) => prev + 1)}>Next</button>
            ) : (
              <button className="primary-btn" onClick={submitExam}>Submit</button>
            )}
          </div>
        </section>
      ) : (
        <section className="card">
          <h2>Exam complete</h2>
          <p>You scored {result?.correct}/{result?.total} ({result?.percentage}%).</p>
          <p className="small">Review each question below to see the explanation, your answer, and the correct choice.</p>
          <div className="actions">
            <button className="primary-btn" onClick={() => startExam(selectedExam)}>Retry</button>
            <button className="secondary-btn" onClick={() => { setSelectedExam(null); setQuestions([]); setResult(null); }}>Back to dashboard</button>
          </div>
          <div className="review-list">
            {result?.review?.map((item, index) => (
              <div key={`${item.prompt}-${index}`} className="review-item">
                <h3>{index + 1}. {item.prompt}</h3>
                <p><strong>Your answer:</strong> {item.selectedAnswer === undefined ? 'No answer selected' : item.options[item.selectedAnswer]}</p>
                <p><strong>Correct answer:</strong> {item.options[item.answer]}</p>
                <p className={item.isCorrect ? 'success' : 'warning'}>{item.isCorrect ? 'Correct' : 'Needs review'}</p>
                <p className="small">{item.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
