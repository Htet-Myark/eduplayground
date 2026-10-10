import { useState } from 'react';
import { API_URL } from '../config';
import { useReadAloud } from '../hooks/useReadAloud';

function MovieRecap({ onBack }) {
  const [titleInput, setTitleInput] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | loading | done | unknown | error
  const [recap, setRecap] = useState(null);
  const [error, setError] = useState('');

  const { readingState, readingIndex, readError, start, pause, resume, stop, reset } = useReadAloud({
    voice: 'en-US-GuyNeural',
    rate: '-8%',
  });

  const fetchRecap = async () => {
    const title = titleInput.trim();
    if (!title) return;
    reset();
    setPhase('loading');
    setError('');
    setRecap(null);
    try {
      const res = await fetch(`${API_URL}/api/foundry/recap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      }).catch(() => { throw new Error('Cannot reach the server. Make sure the backend is running on port 5000.'); });
      let data;
      try { data = await res.json(); } catch { throw new Error('Server returned an unexpected response.'); }
      if (!res.ok) throw new Error(data.error || 'Failed to generate the recap.');
      if (!data.recap.known) {
        setPhase('unknown');
        return;
      }
      setRecap(data.recap);
      setPhase('done');
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  };

  const newRecap = () => {
    reset();
    setPhase('idle');
    setRecap(null);
    setTitleInput('');
    setError('');
  };

  const chunks = recap
    ? [`${recap.title}${recap.year ? `, ${recap.year}` : ''}. Here is the three minute recap.`, ...recap.recap]
    : [];

  return (
    <section className="card">
      <div className="page-topbar">
        <div>
          <p className="eyebrow">Adults • Movie recaps</p>
          <h2>3-Minute Movie Recap</h2>
        </div>
        <button className="secondary-btn" onClick={() => { stop(); onBack(); }}>Back home</button>
      </div>
      <div className="foundry-badge" style={{ marginBottom: 16 }}>✦ Google Gemini</div>

      {(phase === 'idle' || phase === 'loading' || phase === 'unknown' || phase === 'error') && (
        <div className="game-card">
          <div className="game-main">
            <p style={{ marginTop: 0 }}>Name any movie and get the whole plot — spoilers and all — recapped in about 3 minutes, read aloud to you. 🍿</p>
            <div className="battle-join-row" style={{ maxWidth: 480 }}>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && titleInput.trim() && phase !== 'loading' && fetchRecap()}
                placeholder="e.g. Inception, Titanic, Finding Nemo..."
                maxLength={120}
                autoFocus
              />
              <button className="primary-btn" onClick={fetchRecap} disabled={!titleInput.trim() || phase === 'loading'}>
                Recap it
              </button>
            </div>

            {phase === 'loading' && (
              <div className="foundry-loading">
                <div className="foundry-spinner" />
                <p className="small">Gemini is recapping the movie at super speed...</p>
              </div>
            )}
            {phase === 'unknown' && (
              <p className="warning" style={{ marginTop: 16 }}>
                Hmm, I don&apos;t know that movie. Check the spelling, or try adding the year (e.g. &quot;Dune 2021&quot;).
              </p>
            )}
            {phase === 'error' && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      {phase === 'done' && recap && (
        <div className="game-card">
          <div className="game-main">
            <h2 className={`story-title ${readingIndex === 0 ? 'reading' : ''}`} style={{ fontSize: '1.6rem', marginBottom: 4 }}>
              {recap.title}{recap.year ? ` (${recap.year})` : ''}
            </h2>
            <div className="recap-meta">
              <span className={`confidence-badge confidence-${recap.confidence}`}>
                {recap.confidence === 'high' && '✅ High confidence'}
                {recap.confidence === 'medium' && '🤔 Medium confidence — small details may be off'}
                {recap.confidence === 'low' && '⚠️ Low confidence — take this recap with a grain of salt'}
              </span>
            </div>
            <p className="small" style={{ marginBottom: 14 }}>⚠️ Full spoilers ahead — that&apos;s the point!</p>
            <div className="actions" style={{ marginTop: 0, marginBottom: 18 }}>
              {readingState === 'idle' && (
                <button className="primary-btn" onClick={() => start(chunks)}>🔊 Read it to me</button>
              )}
              {readingState === 'reading' && (
                <button className="primary-btn" onClick={pause}>⏸ Pause</button>
              )}
              {readingState === 'paused' && (
                <button className="primary-btn" onClick={resume}>▶ Keep going</button>
              )}
              {readingState !== 'idle' && (
                <button className="secondary-btn" onClick={stop}>⏹ Stop</button>
              )}
              <button className="secondary-btn" onClick={newRecap}>🎬 Another movie</button>
            </div>
            {readError && <p className="error" style={{ marginBottom: 12 }}>{readError}</p>}
            <div className="story-text">
              {recap.recap.map((paragraph, index) => (
                <p key={index} className={`story-paragraph ${readingIndex === index + 1 ? 'reading' : ''}`}>
                  {paragraph}
                </p>
              ))}
            </div>
            <p className="small foundry-source">Recap by {recap.source}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default MovieRecap;
