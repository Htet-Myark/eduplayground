import { useState } from 'react';
import { logoQuizBrands } from '../data/logoQuizBrands';
import { normalizeForLogo, shuffleArray } from '../utils';

function LogoGuesser({ onBack }) {
  const [round, setRound] = useState(() => shuffleArray(logoQuizBrands).slice(0, 8));
  const [roundIndex, setRoundIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('playing');

  const startRound = () => {
    setRound(shuffleArray(logoQuizBrands).slice(0, 8));
    setRoundIndex(0);
    setGuess('');
    setFeedback(null);
    setScore(0);
    setGameState('playing');
  };

  const submitGuess = () => {
    const current = round[roundIndex];
    if (!current || !guess.trim()) return;
    const normalizedGuess = normalizeForLogo(guess);
    const accepted = [current.name, ...(current.aliases || [])];
    const isCorrect = accepted.some((a) => normalizeForLogo(a) === normalizedGuess);
    if (isCorrect) setScore((prev) => prev + 1);
    setFeedback(isCorrect ? 'correct' : 'wrong');
  };

  const nextLogo = () => {
    const next = roundIndex + 1;
    if (next >= round.length) {
      setGameState('done');
    } else {
      setRoundIndex(next);
      setGuess('');
      setFeedback(null);
    }
  };

  const current = round[roundIndex];

  return (
    <section className="card">
      <div className="page-topbar">
        <div>
          <p className="eyebrow">Kids • Logo Guesser</p>
          <h2>Can you name this logo?</h2>
        </div>
        <button className="secondary-btn" onClick={onBack}>Back</button>
      </div>
      <div className="foundry-badge" style={{ marginBottom: 16 }}>✦ Google Gemini</div>

      {gameState === 'done' ? (
        <div className="game-celebration">
          <span className="celebration-emoji">🏆</span>
          <h2>Nice job!</h2>
          <p>You got <strong>{score} of {round.length}</strong> logos right.</p>
          <div className="actions">
            <button className="primary-btn" onClick={startRound}>Play again</button>
            <button className="secondary-btn" onClick={onBack}>Back</button>
          </div>
        </div>
      ) : (
        <div className="game-card">
          <div className="game-banner">
            <h3>Logo {roundIndex + 1} of {round.length}</h3>
            <span className="attempt-badge" style={{ background: 'rgba(69,211,191,0.12)', color: '#45d3bf', borderColor: 'rgba(69,211,191,0.3)' }}>
              {score} correct
            </span>
          </div>
          <div className="game-main">
            <div className="logo-display-card">
              <img
                src={`https://cdn.simpleicons.org/${current?.slug}`}
                alt="Brand logo"
                className="logo-img"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>

            {feedback === null ? (
              <>
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>What brand is this?</label>
                  <input
                    type="text"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && guess.trim() && submitGuess()}
                    placeholder="Type the brand name..."
                    autoFocus
                  />
                </div>
                <div className="actions">
                  <button className="primary-btn" onClick={submitGuess} disabled={!guess.trim()}>Guess!</button>
                </div>
              </>
            ) : (
              <div style={{ marginTop: 16 }}>
                <p className={feedback === 'correct' ? 'success' : 'warning'} style={{ fontSize: '1.1rem', marginBottom: 8 }}>
                  {feedback === 'correct' ? `✓ Correct! It's ${current?.name}!` : `✗ It was ${current?.name}`}
                </p>
                <div className="actions">
                  <button className="primary-btn" onClick={nextLogo}>
                    {roundIndex < round.length - 1 ? 'Next logo' : 'See results'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default LogoGuesser;
