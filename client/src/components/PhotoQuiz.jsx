import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../config';
import { photoQuizWords } from '../data/photoQuizWords';
import { shuffleArray } from '../utils';

function PhotoQuiz({ onBack }) {
  const [round, setRound] = useState(() => shuffleArray(photoQuizWords).slice(0, 5));
  const [roundIndex, setRoundIndex] = useState(0);
  const [cameraState, setCameraState] = useState('prompt');
  const [captureBase64, setCaptureBase64] = useState(null);
  const [captureUrl, setCaptureUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(() => Date.now());
  const [timer, setTimer] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (cameraState === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraState]);

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (cameraState === 'done' || !startTime) return undefined;
    const id = window.setInterval(() => {
      setTimer(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cameraState, startTime]);

  const startRound = () => {
    stopCamera();
    setRound(shuffleArray(photoQuizWords).slice(0, 5));
    setRoundIndex(0);
    setScore(0);
    setStartTime(Date.now());
    setTimer(0);
    setElapsed(0);
    setCameraState('prompt');
    setCaptureBase64(null);
    setCaptureUrl(null);
    setResult(null);
    setError('');
    setLoading(false);
  };

  const openCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setCameraState('camera');
    } catch {
      setError('Camera access denied. Please allow camera permission and try again.');
    }
  };

  const snapPhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    setCaptureBase64(dataUrl.split(',')[1]);
    setCaptureUrl(dataUrl);
    setCameraState('preview');
  };

  const submitSnap = async () => {
    const expected = round[roundIndex]?.answer;
    if (!captureBase64 || !expected) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/foundry/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: captureBase64, mimeType: 'image/jpeg', expectedAnswer: expected }),
      }).catch(() => { throw new Error('Cannot reach the server. Make sure the backend is running on port 5000.'); });
      let data;
      try { data = await res.json(); } catch { throw new Error('Server returned an unexpected response.'); }
      if (!res.ok) throw new Error(data.error || 'Classification failed.');
      if (data.matches) setScore((prev) => prev + 1);
      setResult(data);
      setCameraState('result');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const nextChallenge = () => {
    const next = roundIndex + 1;
    if (next >= round.length) {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
      setCameraState('done');
    } else {
      setRoundIndex(next);
      setCaptureBase64(null);
      setCaptureUrl(null);
      setResult(null);
      setError('');
      setCameraState('prompt');
    }
  };

  const currentWord = round[roundIndex];

  return (
    <section className="card">
      <div className="page-topbar">
        <div>
          <p className="eyebrow">Kids • Photo Quiz</p>
          <h2>Photo Challenge</h2>
        </div>
        <button className="secondary-btn" onClick={() => { stopCamera(); onBack(); }}>Back</button>
      </div>
      <div className="foundry-badge" style={{ marginBottom: 16 }}>✦ Gemini Vision</div>

      {cameraState !== 'done' && round.length > 0 && (
        <div className="game-banner" style={{ marginBottom: 12 }}>
          <h3>Photo {roundIndex + 1} of {round.length}</h3>
          <span className="attempt-badge" style={{ background: 'rgba(69,211,191,0.12)', color: '#45d3bf', borderColor: 'rgba(69,211,191,0.3)' }}>
            {timer}s
          </span>
        </div>
      )}

      {cameraState === 'done' ? (
        <div className="game-celebration">
          <span className="celebration-emoji">📸</span>
          <h2>Round complete!</h2>
          <p>You matched <strong>{score} of {round.length}</strong> objects correctly.</p>
          <p>Time: <strong>{elapsed} seconds</strong></p>
          <div className="actions">
            <button className="primary-btn" onClick={startRound}>Play again</button>
            <button className="secondary-btn" onClick={onBack}>Back</button>
          </div>
        </div>
      ) : (
        <div className="game-card">
          <div className="game-main">
            <p className="word-clue">Your challenge:</p>
            <h2 style={{ fontSize: '1.6rem', margin: '4px 0 16px', lineHeight: 1.3 }}>{currentWord?.prompt}</h2>

            {cameraState === 'prompt' && (
              <div className="photo-prompt-area">
                <span className="photo-icon">📷</span>
                <p>Point your camera at a <strong>{currentWord?.answer}</strong> and snap the photo.</p>
                {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
                <div className="actions" style={{ marginTop: 16 }}>
                  <button className="primary-btn" onClick={openCamera}>Open Camera</button>
                </div>
              </div>
            )}

            {cameraState === 'camera' && (
              <div className="camera-wrapper">
                <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />
                <div className="camera-actions">
                  <button className="snap-btn" onClick={snapPhoto}>📸 Snap!</button>
                  <button className="secondary-btn" onClick={() => { stopCamera(); setCameraState('prompt'); }}>Cancel</button>
                </div>
              </div>
            )}

            {(cameraState === 'preview' || cameraState === 'result') && captureUrl && (
              <div className="photo-result">
                <img src={captureUrl} alt="Your snap" className="photo-preview" />

                {cameraState === 'preview' && (
                  <>
                    {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
                    <div className="actions" style={{ marginTop: 12 }}>
                      {!loading ? (
                        <>
                          <button className="primary-btn" onClick={submitSnap}>Check it</button>
                          <button className="secondary-btn" onClick={() => { setCaptureBase64(null); setCaptureUrl(null); setError(''); openCamera(); }}>Retake</button>
                        </>
                      ) : (
                        <div className="foundry-loading">
                          <div className="foundry-spinner" />
                          <p className="small">AI is checking your photo...</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {cameraState === 'result' && result && (
                  <>
                    <div className={`photo-verdict ${result.matches ? 'photo-verdict-correct' : 'photo-verdict-wrong'}`}>
                      <span className="photo-verdict-emoji">{result.matches ? '✅' : '❌'}</span>
                      <div>
                        <p className="photo-verdict-text">
                          {result.matches
                            ? `Correct! That's a ${result.detected}.`
                            : `That looks like a ${result.detected}.`}
                        </p>
                        <p className="small">Confidence: {result.confidence}</p>
                      </div>
                    </div>
                    <p className="small foundry-source" style={{ marginTop: 10 }}>
                      Classified by Google Gemini
                    </p>
                    <div className="actions" style={{ marginTop: 12 }}>
                      <button className="primary-btn" onClick={nextChallenge}>
                        {roundIndex < round.length - 1 ? 'Next challenge' : 'See results'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default PhotoQuiz;
