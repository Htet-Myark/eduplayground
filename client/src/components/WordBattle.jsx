import { useEffect, useRef, useState } from 'react';
import { API_URL, WS_URL } from '../config';

function WordBattle({ onBack }) {
  const [stage, setStage] = useState('menu');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [lanUrl, setLanUrl] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [clue, setClue] = useState('');
  const [myHp, setMyHp] = useState(100);
  const [oppHp, setOppHp] = useState(100);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [feedbackKey, setFeedbackKey] = useState(0);
  const [result, setResult] = useState(null);
  const [rematchMine, setRematchMine] = useState(false);
  const [rematchTheirs, setRematchTheirs] = useState(false);
  const [error, setError] = useState('');

  const wsRef = useRef(null);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setFeedbackKey((prev) => prev + 1);
  };

  const handleMessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.type === 'created') {
      setRoomCode(msg.code);
      setStage('waiting');
    } else if (msg.type === 'start') {
      setOpponentName(msg.opponentName);
      setClue(msg.clue);
      setMyHp(msg.myHp);
      setOppHp(msg.oppHp);
      setAnswer('');
      setFeedback(null);
      setResult(null);
      setRematchMine(false);
      setRematchTheirs(false);
      setStage('fighting');
    } else if (msg.type === 'hit') {
      setMyHp(msg.myHp);
      setOppHp(msg.oppHp);
      setClue(msg.clue);
      setAnswer('');
      showFeedback('hit', `⚔️ "${msg.word}" — direct hit! -10`);
      if (msg.won) {
        setResult('won');
        setStage('finished');
      }
    } else if (msg.type === 'gotHit') {
      setMyHp(msg.myHp);
      setOppHp(msg.oppHp);
      showFeedback('gotHit', `💥 ${msg.byName} spelled "${msg.word}" and hit you! -10`);
      if (msg.lost) {
        setResult('lost');
        setStage('finished');
      }
    } else if (msg.type === 'miss') {
      showFeedback('miss', 'Not quite — try again!');
    } else if (msg.type === 'rematchRequested') {
      setRematchTheirs(true);
    } else if (msg.type === 'opponentLeft') {
      setStage((current) => (current === 'menu' ? current : 'opponentLeft'));
    } else if (msg.type === 'error') {
      setError(msg.message || 'Something went wrong.');
    }
  };

  const ensureSocket = () => new Promise((resolve, reject) => {
    const existing = wsRef.current;
    if (existing && existing.readyState === WebSocket.OPEN) {
      resolve(existing);
      return;
    }
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => resolve(ws);
    ws.onerror = () => reject(new Error('Cannot reach the battle server. Make sure the backend is running.'));
    ws.onmessage = handleMessage;
  });

  useEffect(() => () => {
    if (wsRef.current) {
      wsRef.current.onmessage = null;
      wsRef.current.close();
    }
  }, []);

  useEffect(() => {
    const { hostname, origin } = window.location;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
    // Deployed publicly: a friend just opens this same URL from any device.
    if (!isLocal) {
      setLanUrl(origin);
      return;
    }
    // Local network: show the http://<your-ip>:3000 address from the server.
    fetch(`${API_URL}/api/battle/info`)
      .then((res) => res.json())
      .then((data) => {
        if (data.lanIp) setLanUrl(`http://${data.lanIp}:${data.port}`);
      })
      .catch(() => {});
  }, []);

  const sendMessage = (payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const createRoom = async () => {
    setError('');
    try {
      await ensureSocket();
      sendMessage({ type: 'create', name: playerName.trim() || 'Player 1' });
    } catch (err) {
      setError(err.message);
    }
  };

  const joinRoom = async () => {
    setError('');
    try {
      await ensureSocket();
      sendMessage({ type: 'join', code: joinCode, name: playerName.trim() || 'Player 2' });
    } catch (err) {
      setError(err.message);
    }
  };

  const submitAnswer = () => {
    if (!answer.trim()) return;
    sendMessage({ type: 'answer', text: answer });
  };

  const requestRematch = () => {
    setRematchMine(true);
    sendMessage({ type: 'rematch' });
  };

  const backToMenu = () => {
    if (wsRef.current) {
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setStage('menu');
    setRoomCode('');
    setJoinCode('');
    setError('');
    setFeedback(null);
    setResult(null);
  };

  const renderHpBar = (label, hp, mine) => (
    <div className={`battle-fighter ${mine ? 'mine' : 'theirs'}`}>
      <div className="battle-fighter-head">
        <span className="battle-avatar">{mine ? '🧑‍🚀' : '👾'}</span>
        <span className="battle-name">{label}</span>
        <span className="battle-hp-num">{hp} HP</span>
      </div>
      <div className="track-bar">
        <div className={`hp-fill ${mine ? 'hp-mine' : 'hp-theirs'} ${hp <= 30 ? 'hp-low' : ''}`} style={{ width: `${hp}%` }} />
      </div>
    </div>
  );

  return (
    <section className="card">
      <div className="page-topbar">
        <div>
          <p className="eyebrow">Kids • Multiplayer</p>
          <h2>Word Battle</h2>
        </div>
        <button className="secondary-btn" onClick={() => { backToMenu(); onBack(); }}>Back</button>
      </div>

      {stage === 'menu' && (
        <div className="game-card">
          <div className="game-main">
            <p style={{ marginTop: 0 }}>Battle a friend on another device! Answer word clues to attack — first to knock the other&apos;s HP to zero wins. ⚔️</p>
            <div className="form-group" style={{ maxWidth: 320 }}>
              <label>Your name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Type your name..."
                maxLength={20}
              />
            </div>
            <div className="battle-menu-grid">
              <div className="battle-menu-card">
                <h3>⚔️ Start a battle</h3>
                <p className="small">Get a room code to share with your friend.</p>
                <button className="primary-btn" onClick={createRoom}>Create battle room</button>
              </div>
              <div className="battle-menu-card">
                <h3>🛡️ Join a battle</h3>
                <p className="small">Type the 4-letter code from your friend.</p>
                <div className="battle-join-row">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && joinCode.trim() && joinRoom()}
                    placeholder="CODE"
                    maxLength={4}
                    className="battle-code-input"
                  />
                  <button className="primary-btn" onClick={joinRoom} disabled={joinCode.trim().length !== 4}>Join</button>
                </div>
              </div>
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      {stage === 'waiting' && (
        <div className="game-celebration">
          <span className="celebration-emoji">⏳</span>
          <h2>Waiting for your friend...</h2>
          <p>Tell them to join with this code:</p>
          <div className="battle-room-code">{roomCode}</div>
          {lanUrl && (
            <p className="small" style={{ marginTop: 14 }}>
              On their device, open <strong>{lanUrl}</strong> → Kids → Word Battle → Join.
            </p>
          )}
          <div className="actions">
            <button className="secondary-btn" onClick={backToMenu}>Cancel</button>
          </div>
        </div>
      )}

      {(stage === 'fighting' || stage === 'finished') && (
        <div className="game-card">
          <div className="battle-arena">
            {renderHpBar(playerName.trim() || 'You', myHp, true)}
            <div className="battle-vs">VS</div>
            {renderHpBar(opponentName || 'Opponent', oppHp, false)}
          </div>

          {feedback && (
            <div key={feedbackKey} className={`battle-feedback battle-feedback-${feedback.type}`}>
              {feedback.text}
            </div>
          )}

          {stage === 'fighting' && (
            <div className="game-main">
              <p className="word-clue">Your word clue:</p>
              <h2 style={{ fontSize: '1.3rem', margin: '4px 0 14px', lineHeight: 1.4 }}>{clue}</h2>
              <div className="battle-join-row" style={{ maxWidth: 420 }}>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                  placeholder="Type the word to attack!"
                  autoFocus
                />
                <button className="primary-btn" onClick={submitAnswer} disabled={!answer.trim()}>⚔️ Attack</button>
              </div>
            </div>
          )}

          {stage === 'finished' && (
            <div className="game-celebration" style={{ paddingTop: 16 }}>
              <span className="celebration-emoji">{result === 'won' ? '🏆' : '💔'}</span>
              <h2>{result === 'won' ? 'You win!' : `${opponentName || 'Your friend'} wins!`}</h2>
              {rematchTheirs && !rematchMine && <p>{opponentName} wants a rematch!</p>}
              {rematchMine && <p className="small">Waiting for {opponentName} to accept the rematch...</p>}
              <div className="actions">
                {!rematchMine && (
                  <button className="primary-btn" onClick={requestRematch}>🔁 Rematch</button>
                )}
                <button className="secondary-btn" onClick={backToMenu}>Leave battle</button>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === 'opponentLeft' && (
        <div className="game-celebration">
          <span className="celebration-emoji">🚪</span>
          <h2>Your friend left the battle.</h2>
          <div className="actions">
            <button className="primary-btn" onClick={backToMenu}>Back to battle menu</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default WordBattle;
