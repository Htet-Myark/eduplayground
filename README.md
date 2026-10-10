# EduPlayground

EduPlayground is a browser-based learning and creativity platform set on an explorable 3D island. Players walk between stations for exam practice, kids' games, sleep sounds, karaoke, movie recaps, and multiplayer word battles.

## Features

- **3D world:** Explore the island using keyboard controls on desktop or touch controls on mobile.
- **Exam practice:** AWS Cloud Practitioner, Azure Fundamentals, Kubernetes Basics, and Docker Essentials.
- **Kids' games:** Pronunciation practice, AI-generated riddles, photo challenges, logo guessing, and bedtime stories.
- **AI experiences:** Gemini generates riddles, bedtime stories, movie recaps, logo hints, and photo classifications.
- **Movie recaps:** Get a spoken recap in learner-friendly English, with a confidence indicator.
- **Sleep sounds:** Ambient sounds synthesized in the browser with the Web Audio API.
- **Blind karaoke:** Guess songs from short previews.
- **Word Battle:** Real-time multiplayer word battles over WebSockets.
- **MCP server:** Use the exam and Gemini tools from GitHub Copilot Chat in VS Code.

## Why the AI provider changed

The original AI features used a GitHub token with GitHub Models. The GitHub Models inference service was retired, so requests to its model endpoint stopped working. A newly created GitHub token does not restore access to that retired endpoint.

The AI features now use the **Gemini API** through Google's OpenAI-compatible endpoint. This lets the project keep using its existing OpenAI client library while calling Gemini models for text and vision.

Google offers free-tier API usage for eligible models, but model availability, quotas, rate limits, and terms depend on the account and can change. Review the current [Gemini API pricing and limits](https://ai.google.dev/gemini-api/docs/pricing) before relying on the free tier. Do not send secrets or sensitive personal information to the API.

## Technology

- **Frontend:** React, Vite, Three.js, `@react-three/fiber`, and `@react-three/drei`
- **Backend:** Node.js, Express, PostgreSQL (optional), and WebSockets
- **AI:** Gemini API through the OpenAI JavaScript SDK
- **Speech:** `msedge-tts` with browser speech synthesis fallback
- **MCP:** `@modelcontextprotocol/sdk`

## Local development

### Requirements

- Node.js 18 or newer
- A Gemini API key for the AI features. Create one in [Google AI Studio](https://aistudio.google.com/apikey).

### Install and configure

From the repository root:

```bash
npm install
```

Create `server/.env` (or copy `server/.env.example`) and set:

```dotenv
PORT=5000
GEMINI_API_KEY=your-gemini-api-key
```

The default model is `gemini-3.8-flash`. To use another model available to your API key, optionally set:

```dotenv
GEMINI_MODEL=your-model-name
```

Keep the API key in the backend environment only. Do not put it in a `VITE_` variable, commit it, or share it publicly. The repository ignores `server/.env`.

Start the frontend and backend together:

```bash
npm run dev
```

| Service | Local URL |
|---|---|
| Frontend | <http://localhost:3000> |
| Backend API | <http://localhost:5000> |

The backend can run without a Gemini key, but AI-powered features will be unavailable. The rest of the app can still be used.

## Gemini integration

The shared Gemini client and feature implementations are in `server/services/foundry.js`. The server reads `GEMINI_API_KEY` and sends requests to:

```text
https://generativelanguage.googleapis.com/v1beta/openai/
```

AI-backed routes include:

| Route | Feature |
|---|---|
| `POST /api/foundry/riddle` | Generate a kid-friendly riddle |
| `POST /api/foundry/classify` | Classify a submitted photo |
| `POST /api/foundry/logo-hint` | Generate a child-friendly logo clue |
| `POST /api/foundry/story` | Write a bedtime story |
| `POST /api/foundry/recap` | Generate a movie recap |

Check backend configuration at `GET /health`. The response includes a `geminiConfigured` boolean; it never returns the API key.

## Deployment

The project is configured for a Vercel frontend and a persistent Node.js backend on Render. WebSocket multiplayer requires a host that supports long-lived connections.

1. Deploy the backend to Render using [`render.yaml`](render.yaml), or configure a Node web service with `npm install` as the build command and `npm run start` as the start command.
2. In the backend host's environment settings, add `GEMINI_API_KEY`. Optionally set `GEMINI_MODEL` to select a different available Gemini model.
3. Deploy the frontend to Vercel and set `VITE_API_URL` to the public backend URL, for example `https://your-service.onrender.com`.
4. Redeploy the frontend after changing `VITE_API_URL`, since Vite embeds it during the build.

Never add the Gemini API key to the frontend's environment or source code.

## GitHub Copilot MCP server

The repository includes an MCP server configured in `.vscode/mcp.json`. Once `GEMINI_API_KEY` is set in `server/.env`, restart or reload VS Code to use its tools from Copilot Chat:

- `generate_riddle`
- `generate_logo_hint`
- `list_exams`
- `gemini_status`

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.