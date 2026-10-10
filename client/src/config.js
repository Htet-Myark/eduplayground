// Where the frontend finds the backend (REST + WebSocket).
//
// Production (Vercel): set VITE_API_URL to your Render backend URL, e.g.
//   VITE_API_URL=https://eduplayground-srhk.onrender.com
// Vite inlines this at BUILD time, so changing it in Vercel requires a redeploy.
// The WebSocket URL is derived from it (https -> wss, http -> ws).
//
// Local dev: with VITE_API_URL unset, use the backend on localhost:5000.
const envUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

if (import.meta.env.PROD && !envUrl) {
  console.error(
    'VITE_API_URL is not set in this build. Every API call will fail. ' +
    'Set it in the Vercel project settings (Production scope) and redeploy.'
  );
}

export const API_URL = envUrl || 'http://localhost:5000';
export const WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws/battle`;
