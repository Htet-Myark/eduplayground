import http from 'http';
import os from 'os';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { questionTemplates } from './data/questions.js';
import { isGeminiConfigured, generateRiddle, randomTopic, classifyImage, generateLogoHint, generateBedtimeStory, generateMovieRecap } from './services/foundry.js';
import { synthesizeSpeech } from './services/tts.js';
import { setupBattleServer } from './services/battle.js';
import { createKaraokeRound, checkKaraokeGuess, revealKaraokeRound } from './services/karaoke.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const useInMemoryStore = !process.env.DATABASE_URL;
const memoryUsers = [];

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  if (useInMemoryStore) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function getUserByEmail(email) {
  if (useInMemoryStore) {
    return memoryUsers.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

async function createUser(name, email, passwordHash) {
  if (useInMemoryStore) {
    const user = { id: Date.now(), name, email, password_hash: passwordHash, attempts: [] };
    memoryUsers.push(user);
    return user;
  }

  const result = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
    [name, email, passwordHash]
  );
  return result.rows[0];
}

async function getUserById(userId) {
  if (useInMemoryStore) {
    return memoryUsers.find((user) => user.id === Number(userId));
  }

  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0];
}

await initDb();

app.get('/health', (_req, res) => {
  res.json({ ok: true, message: 'Server running', geminiConfigured: isGeminiConfigured() });
});

app.post('/api/foundry/riddle', async (req, res) => {
  if (!isGeminiConfigured()) {
    return res.status(503).json({
      error: 'Gemini is not configured.',
      hint: 'Set GEMINI_API_KEY in server/.env',
    });
  }
  const topic = req.body?.topic || randomTopic();
  try {
    const riddle = await generateRiddle(topic);
    res.json({ riddle });
  } catch (err) {
    console.error('generateRiddle error:', err.message);
    res.status(500).json({ error: 'Failed to generate riddle. Check your Foundry configuration.' });
  }
});

app.post('/api/foundry/classify', async (req, res) => {
  if (!isGeminiConfigured()) {
    return res.status(503).json({
      error: 'Gemini is not configured.',
      hint: 'Set GEMINI_API_KEY in server/.env',
    });
  }
  const { imageBase64, mimeType, expectedAnswer } = req.body;
  if (!imageBase64 || !expectedAnswer) {
    return res.status(400).json({ error: 'imageBase64 and expectedAnswer are required.' });
  }
  try {
    const result = await classifyImage(imageBase64, mimeType || 'image/jpeg', expectedAnswer);
    res.json(result);
  } catch (err) {
    console.error('classifyImage error:', err.message);
    res.status(500).json({ error: 'Image classification failed. Please try again.' });
  }
});

app.post('/api/foundry/logo-hint', async (req, res) => {
  if (!isGeminiConfigured()) {
    return res.status(503).json({ error: 'Gemini is not configured. Set GEMINI_API_KEY in server/.env' });
  }
  const { brandName } = req.body;
  if (!brandName) return res.status(400).json({ error: 'brandName is required.' });
  try {
    const hint = await generateLogoHint(brandName);
    res.json({ hint });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate hint. Please try again.' });
  }
});

app.post('/api/foundry/story', async (req, res) => {
  if (!isGeminiConfigured()) {
    return res.status(503).json({ error: 'Gemini is not configured. Set GEMINI_API_KEY in server/.env' });
  }
  const { hero, trait, place, friend, magic } = req.body || {};
  if (!hero || !trait || !place || !friend || !magic) {
    return res.status(400).json({ error: 'hero, trait, place, friend, and magic are required.' });
  }
  try {
    const story = await generateBedtimeStory({ hero, trait, place, friend, magic });
    res.json({ story });
  } catch (err) {
    console.error('generateBedtimeStory error:', err.message);
    res.status(500).json({ error: 'Failed to generate the story. Please try again.' });
  }
});

app.post('/api/karaoke/round', async (req, res) => {
  try {
    const round = await createKaraokeRound(req.body?.excludeTitles || []);
    res.json(round);
  } catch (err) {
    console.error('karaoke round error:', err.message);
    res.status(500).json({ error: 'Could not load a song right now. Please try again.' });
  }
});

app.post('/api/karaoke/guess', (req, res) => {
  const { roundId, guess } = req.body || {};
  if (!roundId || typeof guess !== 'string') {
    return res.status(400).json({ error: 'roundId and guess are required.' });
  }
  const result = checkKaraokeGuess(roundId, guess);
  if (!result) return res.status(404).json({ error: 'Round not found or expired.' });
  res.json(result);
});

app.post('/api/karaoke/reveal', (req, res) => {
  const { roundId } = req.body || {};
  const reveal = revealKaraokeRound(roundId);
  if (!reveal) return res.status(404).json({ error: 'Round not found or expired.' });
  res.json(reveal);
});

app.get('/api/battle/info', (_req, res) => {
  let lanIp = null;
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces || []) {
      if (net.family === 'IPv4' && !net.internal) {
        lanIp = net.address;
        break;
      }
    }
    if (lanIp) break;
  }
  res.json({ lanIp, port: 3000 });
});

app.post('/api/foundry/recap', async (req, res) => {
  if (!isGeminiConfigured()) {
    return res.status(503).json({ error: 'Gemini is not configured. Set GEMINI_API_KEY in server/.env' });
  }
  const { title } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required.' });
  }
  try {
    const recap = await generateMovieRecap(title.trim().slice(0, 120));
    res.json({ recap });
  } catch (err) {
    console.error('generateMovieRecap error:', err.message);
    res.status(500).json({ error: 'Failed to generate the recap. Please try again.' });
  }
});

const ALLOWED_TTS_VOICES = new Set([
  'en-US-AriaNeural',
  'en-US-GuyNeural',
  'en-US-AnaNeural',
  'en-GB-SoniaNeural',
]);

app.post('/api/tts', async (req, res) => {
  const { text, voice, rate } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required.' });
  }
  if (text.length > 2000) {
    return res.status(400).json({ error: 'text is too long (max 2000 characters).' });
  }
  const options = {};
  if (typeof voice === 'string' && ALLOWED_TTS_VOICES.has(voice)) options.voice = voice;
  if (typeof rate === 'string' && /^[+-]\d{1,2}%$/.test(rate)) options.rate = rate;
  try {
    const audio = await synthesizeSpeech(text, options);
    res.set('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (err) {
    console.error('tts error:', err.message);
    res.status(500).json({ error: 'Speech synthesis failed.' });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(name, email, passwordHash);
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/exams', (_req, res) => {
  res.json({
    exams: [
      { id: 'aws', title: 'AWS Cloud Practitioner', description: 'Core AWS services, security, pricing, and architecture.' },
      { id: 'azure', title: 'Azure Fundamentals', description: 'Core Azure services, governance, and security.' },
      { id: 'kubernetes', title: 'Kubernetes Basics', description: 'Pods, deployments, services, and networking.' },
      { id: 'docker', title: 'Docker Essentials', description: 'Containers, images, networking, and volumes.' },
      { id: 'kids', title: 'Kids Riddle Quiz', description: 'Fun 10-question riddles with simple clues and answers for children.' },
    ],
  });
});

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildQuestionSet(examId) {
  const baseQuestions = questionTemplates[examId] || [];
  if (!baseQuestions.length) return [];

  const questionPool = Array.from({ length: 50 }, (_, index) => {
    const base = baseQuestions[index % baseQuestions.length];
    return {
      ...base,
      prompt: base.prompt,
      explanation: base.explanation,
    };
  });

  return shuffleArray(questionPool);
}

app.get('/api/exams/:examId/questions', (req, res) => {
  const { examId } = req.params;
  const questions = buildQuestionSet(examId);
  const limited = examId === 'kids' ? questions.slice(0, 10) : questions;
  res.json({ questions: limited });
});

app.get('/api/users/:userId/records', async (req, res) => {
  const user = await getUserById(req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ records: user.attempts || [] });
});

app.post('/api/exams/:examId/submit', async (req, res) => {
  const { examId } = req.params;
  const { userId, score, total, percentage, review } = req.body;
  const user = await getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const attempt = {
    id: Date.now(),
    examId,
    score,
    total,
    percentage,
    completedAt: new Date().toISOString(),
    review,
  };

  user.attempts = user.attempts || [];
  user.attempts.push(attempt);

  res.json({ success: true, records: user.attempts });
});

const httpServer = http.createServer(app);
setupBattleServer(httpServer);

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
