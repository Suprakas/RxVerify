// The only file that reads Vite's import.meta.env (tests swap it for a stub).
export const API_URL = import.meta.env.VITE_API_URL || '';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;
