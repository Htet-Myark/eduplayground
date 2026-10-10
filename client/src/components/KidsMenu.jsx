function KidsMenu({ onNavigate, onBack }) {
  return (
    <section className="card">
      <div className="page-topbar">
        <div>
          <p className="eyebrow">Kids</p>
          <h2>Fun learning for children</h2>
        </div>
        <button className="secondary-btn" onClick={onBack}>Back</button>
      </div>
      <div className="exam-grid">
        <div className="exam-card">
          <h3>Pronunciation obstacle game</h3>
          <p>Say the English word clearly to clear each obstacle.</p>
          <button className="primary-btn" onClick={() => onNavigate('pronunciationGame')}>Play game</button>
        </div>
        <div className="exam-card foundry-card">
          <div className="foundry-badge">✦ Google Gemini</div>
          <h3>AI Riddle Challenge</h3>
          <p>Fresh riddles generated live by Google Gemini. A new puzzle every time.</p>
          <button className="primary-btn" onClick={() => onNavigate('foundryRiddle')}>Try an AI riddle</button>
        </div>
        <div className="exam-card foundry-card">
          <div className="foundry-badge">✦ Gemini Vision</div>
          <h3>Photo Challenge</h3>
          <p>Find an everyday object, snap a photo, and let AI check if you got it right!</p>
          <button className="primary-btn" onClick={() => onNavigate('photoQuiz')}>Start photo quiz</button>
        </div>
        <div className="exam-card">
          <h3>Word Battle ⚔️</h3>
          <p>Fight a friend on another device! Answer word clues to attack and win the duel.</p>
          <button className="primary-btn" onClick={() => onNavigate('wordBattle')}>Start a battle</button>
        </div>
        <div className="exam-card foundry-card">
          <div className="foundry-badge">✦ Google Gemini</div>
          <h3>Bedtime Story Teller</h3>
          <p>Answer 5 fun questions and AI writes a 10-minute bedtime story, then reads it aloud to you.</p>
          <button className="primary-btn" onClick={() => onNavigate('storyTeller')}>Make my story</button>
        </div>
        <div className="exam-card foundry-card">
          <div className="foundry-badge">✦ Google Gemini</div>
          <h3>Logo Guesser</h3>
          <p>Look at a brand icon and type the name. How many can you get right?</p>
          <button className="primary-btn" onClick={() => onNavigate('logoGuesser')}>Play logo quiz</button>
        </div>
      </div>
    </section>
  );
}

export default KidsMenu;
