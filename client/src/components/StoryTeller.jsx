import { useState } from 'react';
import { API_URL } from '../config';
import { useReadAloud } from '../hooks/useReadAloud';

const STORY_QUESTIONS = [
  {
    key: 'hero',
    question: 'Who is the hero of tonight\'s story?',
    options: [
      { value: 'a brave little knight', emoji: '🛡️', label: 'A brave little knight' },
      { value: 'a curious kitten', emoji: '🐱', label: 'A curious kitten' },
      { value: 'a clever little robot', emoji: '🤖', label: 'A clever little robot' },
      { value: 'a friendly baby dragon', emoji: '🐉', label: 'A friendly baby dragon' },
    ],
  },
  {
    key: 'trait',
    question: 'What is the hero like?',
    options: [
      { value: 'very brave', emoji: '🦁', label: 'Very brave' },
      { value: 'super funny', emoji: '🤪', label: 'Super funny' },
      { value: 'kind and gentle', emoji: '💛', label: 'Kind and gentle' },
      { value: 'always curious', emoji: '🔍', label: 'Always curious' },
    ],
  },
  {
    key: 'place',
    question: 'Where does the story happen?',
    options: [
      { value: 'an enchanted forest', emoji: '🌲', label: 'An enchanted forest' },
      { value: 'outer space among the stars', emoji: '🚀', label: 'Outer space' },
      { value: 'a colorful world under the sea', emoji: '🐠', label: 'Under the sea' },
      { value: 'a sweet candy kingdom', emoji: '🍭', label: 'A candy kingdom' },
    ],
  },
  {
    key: 'friend',
    question: 'Who is the hero\'s best friend?',
    options: [
      { value: 'a talking puppy', emoji: '🐶', label: 'A talking puppy' },
      { value: 'a wise old owl', emoji: '🦉', label: 'A wise old owl' },
      { value: 'a friendly little star', emoji: '⭐', label: 'A friendly little star' },
      { value: 'a baby unicorn', emoji: '🦄', label: 'A baby unicorn' },
    ],
  },
  {
    key: 'magic',
    question: 'What magical thing appears in the story?',
    options: [
      { value: 'a flying carpet', emoji: '✨', label: 'A flying carpet' },
      { value: 'a glowing lantern', emoji: '🏮', label: 'A glowing lantern' },
      { value: 'a song that makes wishes come true', emoji: '🎵', label: 'A wishing song' },
      { value: 'a sparkling wishing stone', emoji: '💎', label: 'A wishing stone' },
    ],
  },
];

function StoryTeller({ onBack }) {
  const [phase, setPhase] = useState('questions');
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState({});
  const [story, setStory] = useState(null);
  const [error, setError] = useState('');
  const { readingState, readingIndex, readError, start, pause, resume, stop, reset } = useReadAloud({ rate: '-10%' });

  const fetchStory = async (finalChoices) => {
    setPhase('loading');
    setError('');
    setStory(null);
    try {
      const res = await fetch(`${API_URL}/api/foundry/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalChoices),
      }).catch(() => { throw new Error('Cannot reach the server. Make sure the backend is running on port 5000.'); });
      let data;
      try { data = await res.json(); } catch { throw new Error('Server returned an unexpected response.'); }
      if (!res.ok) throw new Error(data.error || 'Failed to generate the story.');
      setStory(data.story);
      setPhase('story');
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  };

  const pickAnswer = (value) => {
    const next = { ...choices, [STORY_QUESTIONS[step].key]: value };
    setChoices(next);
    if (step < STORY_QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      fetchStory(next);
    }
  };

  const restart = () => {
    reset();
    setPhase('questions');
    setStep(0);
    setChoices({});
    setStory(null);
    setError('');
  };

  const startReading = () => start([story.title, ...story.paragraphs]);

  const wordCount = story ? story.paragraphs.join(' ').split(/\s+/).length : 0;
  const readMinutes = Math.max(1, Math.round(wordCount / 130));
  const currentQuestion = STORY_QUESTIONS[step];

  return (
    <section className="card">
      <div className="page-topbar">
        <div>
          <p className="eyebrow">Kids • Bedtime story</p>
          <h2>Interactive Story Teller</h2>
        </div>
        <button className="secondary-btn" onClick={() => { stop(); onBack(); }}>Back</button>
      </div>
      <div className="foundry-badge" style={{ marginBottom: 16 }}>✦ Google Gemini</div>

      {phase === 'questions' && (
        <div className="game-card">
          <div className="game-banner">
            <h3>Question {step + 1} of {STORY_QUESTIONS.length}</h3>
            <span className="attempt-badge" style={{ background: 'rgba(69,211,191,0.12)', color: '#45d3bf', borderColor: 'rgba(69,211,191,0.3)' }}>
              Building your story
            </span>
          </div>
          <div className="game-main">
            <h2 style={{ fontSize: '1.5rem', margin: '4px 0 18px' }}>{currentQuestion.question}</h2>
            <div className="sound-grid">
              {currentQuestion.options.map((option) => (
                <button key={option.value} className="sound-card" onClick={() => pickAnswer(option.value)}>
                  <span className="sound-emoji">{option.emoji}</span>
                  <span className="sound-name">{option.label}</span>
                </button>
              ))}
            </div>
            {step > 0 && (
              <div className="actions">
                <button className="secondary-btn" onClick={() => setStep(step - 1)}>Previous question</button>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="foundry-loading">
          <div className="foundry-spinner" />
          <p className="small">Gemini is writing tonight's story just for you... this takes a little moment.</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="game-card">
          <p className="error">{error}</p>
          <div className="actions">
            <button className="primary-btn" onClick={() => fetchStory(choices)}>Try again</button>
            <button className="secondary-btn" onClick={restart}>Start over</button>
          </div>
        </div>
      )}

      {phase === 'story' && story && (
        <div className="game-card">
          <div className="game-main">
            <h2 className={`story-title ${readingIndex === 0 ? 'reading' : ''}`} style={{ fontSize: '1.6rem', marginBottom: 4 }}>{story.title}</h2>
            <p className="small" style={{ marginBottom: 14 }}>About {readMinutes} minutes when read aloud 🌙</p>
            <div className="actions" style={{ marginTop: 0, marginBottom: 18 }}>
              {readingState === 'idle' && (
                <button className="primary-btn" onClick={startReading}>🔊 Read it to me</button>
              )}
              {readingState === 'reading' && (
                <button className="primary-btn" onClick={pause}>⏸ Pause</button>
              )}
              {readingState === 'paused' && (
                <button className="primary-btn" onClick={resume}>▶ Keep reading</button>
              )}
              {readingState !== 'idle' && (
                <button className="secondary-btn" onClick={stop}>⏹ Stop</button>
              )}
              <button className="secondary-btn" onClick={restart}>📖 New story</button>
            </div>
            {readError && <p className="error" style={{ marginBottom: 12 }}>{readError}</p>}
            <div className="story-text">
              {story.paragraphs.map((paragraph, index) => (
                <p key={index} className={`story-paragraph ${readingIndex === index + 1 ? 'reading' : ''}`}>
                  {paragraph}
                </p>
              ))}
            </div>
            <p className="small foundry-source">Story by {story.source}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default StoryTeller;
