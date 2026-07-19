// Where the frontend finds the backend (REST + WebSocket).
//
// Production (Vercel): set VITE_API_URL to your Render backend URL, e.g.
//   VITE_API_URL=https://eduplayground-api.onrender.com
// The WebSocket URL is derived from it (https -> wss, http -> ws).
//
// Local dev: with VITE_API_URL unset we fall back to port 5000 on whatever
// hostname the page was opened with, so a friend on the same Wi-Fi can join
// via http://<your-ip>:3000.
const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const envUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

export const API_URL = envUrl || `http://${host}:5000`;
export const WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws/battle`;
