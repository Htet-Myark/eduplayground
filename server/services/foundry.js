import OpenAI from 'openai';

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/* Gemini models get overloaded ("503 This model is currently experiencing high
   demand"), sometimes for long stretches. Every call therefore walks a chain:
   GEMINI_MODEL first, then GEMINI_FALLBACK_MODELS, moving on when a model is
   overloaded, rate-limited, erroring or missing. Anything else (a bad request,
   a bad key) is thrown straight away, since another model would not help. */
const MODEL = () => process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';
const FALLBACKS = () => (process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-3.8-flash,gemini-3.5-flash-lite')
  .split(',').map(m => m.trim()).filter(Boolean);
const modelChain = () => [...new Set([MODEL(), ...FALLBACKS()])];
const RETRYABLE = new Set([404, 429, 500, 502, 503, 504]);

async function createWithFallback(raw, params) {
  let lastErr;
  for (const model of modelChain()) {
    try {
      return await raw.chat.completions.create({ ...params, model });
    } catch (err) {
      if (!RETRYABLE.has(err?.status)) throw err;
      console.warn(`Gemini ${model} failed with ${err.status}; trying the next model`);
      lastErr = err;
    }
  }
  throw lastErr;
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const raw = new OpenAI({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKey,
    maxRetries: 1,        // one quick retry per model; the chain does the rest
    timeout: 30_000,
  });
  return { chat: { completions: { create: params => createWithFallback(raw, params) } } };
}

/* One tiny call to Gemini, reported as a reason a person can act on. Never
   includes the key; long digit runs (project numbers) are masked. */
export async function checkGemini() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: 'no_api_key' };
  const tried = [];
  for (const model of modelChain()) {
    const r = await probeModel(apiKey, model);
    tried.push(r);
    if (r.ok) break;
  }
  const served = tried.find(t => t.ok);
  return { ok: Boolean(served), servedBy: served?.model ?? null, tried };
}

/* plain fetch, not the SDK: Gemini returns errors as a JSON array, which the
   OpenAI SDK cannot read, so it would hide the very message we want */
async function probeModel(apiKey, model) {
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with the word OK.' }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (r.ok) return { model, ok: true, status: r.status };
    let body = await r.json().catch(() => null);
    if (Array.isArray(body)) body = body[0];
    const e = body?.error || {};
    return {
      model, ok: false, status: r.status, reason: e.status || 'error',
      message: String(e.message || '').replace(/\d{7,}/g, '…').slice(0, 200),
    };
  } catch (err) {
    return { model, ok: false, reason: 'network', message: String(err?.message || err).slice(0, 200) };
  }
}

const CONFIG_ERROR = 'Gemini is not configured. Set GEMINI_API_KEY in server/.env.';

const RIDDLE_TOPICS = [
  'animals', 'nature', 'food and fruit', 'vehicles and transport',
  'weather and sky', 'plants and trees', 'space and planets',
  'everyday household objects', 'school supplies', 'sports and games',
];

export function randomTopic() {
  return RIDDLE_TOPICS[Math.floor(Math.random() * RIDDLE_TOPICS.length)];
}

export async function classifyImage(imageBase64, mimeType, expectedAnswer) {
  const client = getClient();
  if (!client) throw new Error(CONFIG_ERROR);

  const completion = await client.chat.completions.create({
    model: MODEL(),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          {
            type: 'text',
            text: `Look at this image. Does it show a "${expectedAnswer}"?
Respond with valid JSON only — no extra text:
{
  "detected": "describe the main subject in 2-4 words",
  "matches": true or false,
  "confidence": "high", "medium", or "low"
}`,
          },
        ],
      },
    ],
    max_tokens: 120,
  });

  const text = completion.choices[0].message.content.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Model returned unexpected format.');
  return JSON.parse(jsonMatch[0]);
}

export async function generateLogoHint(brandName) {
  const client = getClient();
  if (!client) throw new Error(CONFIG_ERROR);

  const completion = await client.chat.completions.create({
    model: MODEL(),
    messages: [
      {
        role: 'system',
        content: `You give child-friendly hints about a brand's logo without naming the brand.
Describe the logo's colors, shape or symbol, and what the company does in 2-3 short sentences.
Never say the brand name. Keep it fun and simple for kids aged 5-12.
Respond with JSON only: { "hint": "..." }`,
      },
      { role: 'user', content: `Give a hint for the brand: ${brandName}` },
    ],
    max_tokens: 150,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(completion.choices[0].message.content);
  return parsed.hint;
}

const STORY_SYSTEM_PROMPT = `You are a gentle bedtime storyteller for children aged 4-9.
You write soothing bedtime stories in parts. Every paragraph MUST be 70 to 90 words long — this is required so the story is long enough to read aloud.
Rules:
- Simple, warm language a young child understands. Short sentences.
- A gentle adventure with no scary moments, no villains who stay mean, and nothing sad.
Respond ONLY with valid JSON — no extra text.`;

export async function generateBedtimeStory(choices) {
  const client = getClient();
  if (!client) throw new Error(CONFIG_ERROR);

  const { hero, trait, place, friend, magic } = choices;

  const setupMessage = `Tonight's story uses these choices the child picked:
- The hero is: ${hero}
- The hero's personality is: ${trait}
- The story happens in: ${place}
- The hero's best friend is: ${friend}
- The magical thing in the story is: ${magic}

Write the FIRST HALF of the story: exactly 8 paragraphs of 70-90 words each.
Introduce the hero and friend, begin a gentle adventure, and stop in the middle of the adventure (do not wrap up).
Respond with JSON: { "title": "a short magical story title", "paragraphs": ["...", ... 8 paragraphs] }`;

  const firstCompletion = await client.chat.completions.create({
    model: MODEL(),
    messages: [
      { role: 'system', content: STORY_SYSTEM_PROMPT },
      { role: 'user', content: setupMessage },
    ],
    temperature: 0.9,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
  });

  const firstPart = JSON.parse(firstCompletion.choices[0].message.content);
  if (!firstPart.title || !Array.isArray(firstPart.paragraphs) || firstPart.paragraphs.length === 0) {
    throw new Error('Model returned unexpected story format.');
  }

  const secondCompletion = await client.chat.completions.create({
    model: MODEL(),
    messages: [
      { role: 'system', content: STORY_SYSTEM_PROMPT },
      { role: 'user', content: setupMessage },
      { role: 'assistant', content: JSON.stringify(firstPart) },
      {
        role: 'user',
        content: `Now write the SECOND HALF: exactly 8 more paragraphs of 70-90 words each, continuing right where the story stopped.
Finish the adventure happily, then make the last 3 paragraphs calmer and sleepier, ending with the hero falling asleep safe and cozy.
Respond with JSON: { "paragraphs": ["...", ... 8 paragraphs] }`,
      },
    ],
    temperature: 0.9,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
  });

  const secondPart = JSON.parse(secondCompletion.choices[0].message.content);
  if (!Array.isArray(secondPart.paragraphs) || secondPart.paragraphs.length === 0) {
    throw new Error('Model returned unexpected story format.');
  }

  return {
    title: firstPart.title,
    paragraphs: [...firstPart.paragraphs, ...secondPart.paragraphs],
    source: 'Google Gemini',
    model: firstCompletion.model,
  };
}

export async function generateMovieRecap(title) {
  const client = getClient();
  if (!client) throw new Error(CONFIG_ERROR);

  const completion = await client.chat.completions.create({
    model: MODEL(),
    messages: [
      {
        role: 'system',
        content: `You narrate movie recaps that are read aloud in about 3 minutes.
Write a recap of the movie the user names: 480-520 words total, split into 6-8 flowing paragraphs. Each paragraph MUST be 65-85 words — this is required so the recap is long enough.
Rules:
- Use simple and intermediate English (CEFR A2-B1 level): common everyday words, short clear sentences. Avoid rare vocabulary, idioms, and complex grammar, so English learners can follow easily.
- Cover the setup, the main characters, the key plot turns, and how it ends. Full spoilers are expected — it is a recap.
- Energetic, clear spoken-narration style. No headings, no lists, no markdown.
- Stay factually accurate to the actual film. Do not invent plot points.
- Rate your confidence that this recap matches the real film: "high" (famous film you know well), "medium" (you know it but some details may be off), or "low" (you only partly remember it).
- If you do not recognize the movie at all, set "known" to false and leave the other fields empty.
Respond ONLY with valid JSON using exactly these fields — no extra text:
{
  "known": true or false,
  "title": "the movie's official title",
  "year": "release year as a string, or empty string",
  "confidence": "high", "medium", or "low",
  "recap": ["paragraph 1", "paragraph 2", ...]
}`,
      },
      { role: 'user', content: `Recap this movie: ${title}` },
    ],
    temperature: 0.6,
    max_tokens: 1400,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(completion.choices[0].message.content);
  if (parsed.known && (!parsed.title || !Array.isArray(parsed.recap) || parsed.recap.length === 0)) {
    throw new Error('Model returned unexpected recap format.');
  }
  if (!['high', 'medium', 'low'].includes(parsed.confidence)) {
    parsed.confidence = 'medium';
  }
  return {
    ...parsed,
    source: 'Google Gemini',
    model: completion.model,
  };
}

export async function generateRiddle(topic = 'everyday objects') {
  const client = getClient();
  if (!client) throw new Error(CONFIG_ERROR);

  const completion = await client.chat.completions.create({
    model: MODEL(),
    messages: [
      {
        role: 'system',
        content: `You are a creative educator generating child-friendly riddles for kids aged 5-10.
Respond ONLY with valid JSON using exactly these fields — no extra text:
{
  "prompt": "the riddle as a fun, engaging question",
  "answerText": "one or two word answer",
  "explanation": "one friendly sentence a child would understand",
  "topic": "the subject area of this riddle"
}
Rules: factually accurate, age-appropriate, short answer, fun phrasing.`,
      },
      {
        role: 'user',
        content: `Generate one riddle about: ${topic}`,
      },
    ],
    temperature: 0.85,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
  });

  if (completion.choices[0]?.finish_reason === 'length') {
    throw new Error('Gemini truncated the riddle response because the output token limit was reached.');
  }

  const parsed = JSON.parse(completion.choices[0].message.content);
  return {
    ...parsed,
    type: 'text',
    source: 'Google Gemini',
    model: completion.model,
  };
}
