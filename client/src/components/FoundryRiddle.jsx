import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { answersMatch } from '../utils';

const FOUNDRY_TOPICS = ['animals', 'nature', 'food and fruit', 'vehicles', 'weather', 'plants', 'space', 'school supplies', 'sports', 'household objects'];

function FoundryRiddle({ onBack }) {
  const [riddle, setRiddle] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRiddle = async (topic) => {
    setLoading(true);
    setError('');
    setAnswer('');
    setResult(null);
    setRiddle(null);
    const chosen = topic || FOUNDRY_TOPICS[Math.floor(Math.random() * FOUNDRY_TOPICS.length)];
    try {
      const res = await fetch(`${API_URL}/api/foundry/riddle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: chosen }),
      }).catch(() => { throw new Error('Cannot reach the server. Make sure the backend is running on port 5000.'); });
      let data;
      try { data = await res.json(); } catch { throw new Error('Server returned an unexpected response. Check that the backend is running.'); }
      if (!res.ok) throw new Error(data.error || 'Failed to generate riddle.');
      setRiddle(data.riddle);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiddle();
  }, []);

  const submitAnswer = () => {
    if (!riddle || result !== null) return;
    setResult(answersMatch(answer, riddle.answerText));
  };

  return (
    <section className="card">
      <div className="page-topbar">
        <div>
          <p className="eyebrow">Kids • AI Riddle</p>
          <h2>Gemini Riddle Challenge</h2>
        </div>
        <button className="secondary-btn" onClick={onBack}>Back</button>
      </div>
      <div className="foundry-badge" style={{ marginBottom: 20 }}>✦ Powered by Google Gemini</div>
      {loading && (
        <div className="foundry-loading">
          <div className="foundry-spinner" />
          <p className="small">Gemini is generating your riddle...</p>
        </div>
      )}
      {error && (
        <div className="game-card">
          <p className="error">{error}</p>
          <p className="small" style={{ marginTop: 8 }}>
            Check the backend terminal for the provider error. Verify <code>GEMINI_API_KEY</code> in <code>server/.env</code>.
          </p>
          <div className="actions">
            <button className="primary-btn" onClick={() => fetchRiddle()}>Try again</button>
          </div>
        </div>
      )}
      {riddle && !loading && (
        <div className="game-card">
          <div className="game-main">
            <p className="word-clue">Topic: {riddle.topic}</p>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.4, margin: '8px 0 20px' }}>
              {riddle.prompt}
            </h2>
            {result === null ? (
              <>
                <div className="form-group">
                  <label>Your answer</label>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                    placeholder="Type your answer..."
                    autoFocus
                  />
                </div>
                <div className="actions">
                  <button className="primary-btn" onClick={submitAnswer} disabled={!answer.trim()}>Submit</button>
                </div>
              </>
            ) : (
              <div>
                <p className={result ? 'success' : 'warning'} style={{ fontSize: '1.1rem', marginBottom: 8 }}>
                  {result ? '✓ Correct!' : `✗ The answer was: ${riddle.answerText}`}
                </p>
                <p style={{ marginBottom: 4 }}>{riddle.explanation}</p>
                <p className="small foundry-source">Source: {riddle.source}</p>
                <div className="actions">
                  <button className="primary-btn" onClick={() => fetchRiddle()}>Next riddle</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default FoundryRiddle;
