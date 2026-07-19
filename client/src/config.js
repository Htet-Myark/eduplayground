// In production, VITE_API_URL points at the deployed backend (Render).
// Left unset — as in local dev — we fall back to the hostname the page was
// opened with, so the app also works when a friend opens it from another
// device on the same network (http://<your-ip>:3000).
const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

// Trailing slashes would produce `//api/...` once joined, so strip them.
const configured = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const API_URL = configured || `http://${host}:5000`;

// A page served over HTTPS may only open a wss:// socket, and API_URL already
// carries the right scheme, so derive the socket URL from it rather than
// hardcoding ws://.
export const WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws/battle`;
