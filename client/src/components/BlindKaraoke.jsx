import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../config';

const CLIP_SECONDS = 10;
const TOTAL_ROUNDS = 5;

function BlindKaraoke({ onBack }) {
  const [phase, setPhase] = useState('intro'); // intro | loading | playing | revealed | gameOver | error
  const [roundNum, setRoundNum] = useState(0);
  const [score, setScore] = useState(0);
  const [roundId, setRoundId] = useState(null);
  const [guess, setGuess] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [reveal, setReveal] = useState(null); // { title, artist, artwork, correct }
  const [error, setError] = useState('');
  const [isClipPlaying, setIsClipPlaying] = useState(false);
  const [playedTitles, setPlayedTitles] = useState([]);
  const [startTime, setStartTime] = useState(0);
  const [timer, setTimer] = useState(0);
  const [finalTime, setFinalTime] = useState(0);

  const audioRef = useRef(null);

  const stopClip = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.ontimeupdate = null;
      audio.onended = null;
      audio.pause();
    }
    setIsClipPlaying(false);
  };

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.ontimeupdate = null;
      audioRef.current.pause();
    }
  }, []);

  useEffect(() => {
    if (!startTime || phase === 'intro' || phase === 'gameOver') return undefined;
    const id = window.setInterval(() => {
      setTimer(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [startTime, phase]);

  const loadRound = async (titlesSoFar) => {
    stopClip();
    setPhase('loading');
    setError('');
    setGuess('');
    setFeedback('');
    setWrongCount(0);
    setReveal(null);
    try {
      const res = await fetch(`${API_URL}/api/karaoke/round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludeTitles: titlesSoFar }),
      }).catch(() => { throw new Error('Cannot reach the server. Make sure the backend is running on port 5000.'); });
      let data;
      try { data = await res.json(); } catch { throw new Error('Server returned an unexpected response.'); }
      if (!res.ok) throw new Error(data.error || 'Could not load a song.');
      setRoundId(data.roundId);
      audioRef.current = new Audio(data.previewUrl);
      setPhase('playing');
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  };

  const startGame = () => {
    setRoundNum(0);
    setScore(0);
    setPlayedTitles([]);
    setStartTime(Date.now());
    setTimer(0);
    setFinalTime(0);
    loadRound([]);
  };

  const playSnippet = () => {
    const audio = audioRef.current;
    if (!audio) return;
    stopClip();
    audio.currentTime = 0;
    // Cut off by playback position, not wall-clock time, so buffering
    // delays never shorten the clip.
    audio.ontimeupdate = () => {
      if (audio.currentTime >= CLIP_SECONDS) {
        audio.ontimeupdate = null;
        audio.pause();
        setIsClipPlaying(false);
      }
    };
    audio.onended = () => setIsClipPlaying(false);
    audio.play().catch(() => {
      setFeedback('Could not play the clip — try again.');
      setIsClipPlaying(false);
    });
    setIsClipPlaying(true);
  };

  const playFull = () => {
    const audio = audioRef.current;
    if (!audio) return;
    stopClip();
    audio.currentTime = 0;
    audio.onended = () => setIsClipPlaying(false);
    audio.play().catch(() => {});
    setIsClipPlaying(true);
  };

  const finishRound = (revealData, correct) => {
    stopClip();
    setReveal({ ...revealData, correct });
    if (correct) setScore((prev) => prev + 1);
    setPlayedTitles((prev) => [...prev, revealData.title]);
    setPhase('revealed');
  };

  const submitGuess = async () => {
    if (!guess.trim() || !roundId) return;
    try {
      const res = await fetch(`${API_URL}/api/karaoke/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId, guess }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Guess failed.');
      if (data.correct) {
        finishRound(data, true);
      } else {
        setWrongCount((prev) => prev + 1);
        setGuess('');
        setFeedback('❌ Not it — listen again and try once more!');
      }
    } catch (err) {
      setFeedback(err.message);
    }
  };

  const giveUp = async () => {
    if (!roundId) return;
    try {
      const res = await fetch(`${API_URL}/api/karaoke/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reveal failed.');
      finishRound(data, false);
    } catch (err) {
      setFeedback(err.message);
    }
  };

  const nextRound = () => {
    stopClip();
    const next = roundNum + 1;
    if (next >= TOTAL_ROUNDS) {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      setFinalTime(seconds);
      setPhase('gameOver');
    } else {
      setRoundNum(next);
      loadRound(playedTitles);
    }
  };

  return (
    <section className="card">
      <div className="page-topbar">
        <div>
          <p className="eyebrow">Music • Guessing game</p>
          <h2>Blind Karaoke</h2>
        </div>
        <button className="secondary-btn" onClick={() => { stopClip(); onBack(); }}>Back home</button>
      </div>

      {phase === 'intro' && (
        <div className="game-card">
          <div className="game-main">
            <p style={{ marginTop: 0 }}>
              🎧 You get a {CLIP_SECONDS}-second clip of a popular song. Guess the song name!
              The clock is ticking — finish all {TOTAL_ROUNDS} songs as fast as you can.
            </p>
            <p className="small">{TOTAL_ROUNDS} rounds • 1 point per song.</p>
            <div className="actions">
              <button className="primary-btn" onClick={startGame}>🎵 Start guessing</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="foundry-loading">
          <div className="foundry-spinner" />
          <p className="small">Picking a song...</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="game-card">
          <p className="error">{error}</p>
          <div className="actions">
            <button className="primary-btn" onClick={() => loadRound(playedTitles)}>Try again</button>
          </div>
        </div>
      )}

      {(phase === 'playing' || phase === 'revealed') && (
        <div className="game-card">
          <div className="game-banner">
            <h3>Song {roundNum + 1} of {TOTAL_ROUNDS}</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="attempt-badge" style={{ background: 'rgba(69,211,191,0.12)', color: '#0f8a78', borderColor: 'rgba(69,211,191,0.3)' }}>
                {score} correct
              </span>
              <span className="attempt-badge" style={{ background: 'rgba(255,204,102,0.12)', color: '#b7791f', borderColor: 'rgba(255,204,102,0.3)' }}>
                ⏱ {timer}s
              </span>
            </div>
          </div>

          {phase === 'playing' && (
            <div className="game-main karaoke-stage">
              <span className={`karaoke-disc ${isClipPlaying ? 'spinning' : ''}`}>💿</span>
              <div className="actions" style={{ justifyContent: 'center', marginTop: 8 }}>
                <button className="primary-btn" onClick={playSnippet}>
                  {isClipPlaying ? '🔊 Playing...' : `▶ Play ${CLIP_SECONDS}-second clip`}
                </button>
              </div>
              <div className="battle-join-row" style={{ maxWidth: 440, margin: '14px auto 0' }}>
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && guess.trim() && submitGuess()}
                  placeholder="What song is this?"
                />
                <button className="primary-btn" onClick={submitGuess} disabled={!guess.trim()}>Guess</button>
              </div>
              {feedback && <p className="warning" style={{ marginTop: 12 }}>{feedback}</p>}
              {wrongCount > 0 && (
                <div className="actions" style={{ justifyContent: 'center', marginTop: 10 }}>
                  <button className="secondary-btn" onClick={giveUp}>🏳️ Give up &amp; reveal</button>
                </div>
              )}
            </div>
          )}

          {phase === 'revealed' && reveal && (
            <div className="game-main karaoke-stage">
              {reveal.artwork && <img src={reveal.artwork} alt="Album art" className="karaoke-art" />}
              <h2 style={{ margin: '12px 0 2px' }}>{reveal.title}</h2>
              <p className="small" style={{ marginBottom: 8 }}>by {reveal.artist}</p>
              <p className={reveal.correct ? 'success' : 'warning'} style={{ fontSize: '1.1rem' }}>
                {reveal.correct ? '🎉 Correct! +1 point' : 'Better luck on the next one!'}
              </p>
              <div className="actions" style={{ justifyContent: 'center' }}>
                <button className="secondary-btn" onClick={playFull}>▶ Hear the full clip</button>
                <button className="primary-btn" onClick={nextRound}>
                  {roundNum + 1 >= TOTAL_ROUNDS ? 'See results' : 'Next song'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'gameOver' && (
        <div className="game-celebration">
          <span className="celebration-emoji">🎤</span>
          <h2>Game over!</h2>
          <p>You guessed <strong>{score} of {TOTAL_ROUNDS}</strong> songs.</p>
          <p>Time: <strong>{finalTime} seconds</strong></p>
          <div className="actions">
            <button className="primary-btn" onClick={startGame}>Play again</button>
            <button className="secondary-btn" onClick={onBack}>Back home</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default BlindKaraoke;
