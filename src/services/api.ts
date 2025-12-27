import axios from 'axios';

// Use same host as the frontend (works for both laptop and phone)
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production, frontend and API are served from same origin
  if (import.meta.env.PROD) {
    return '/api';
  }
  // Development: use current hostname with backend port
  const host = window.location.hostname;
  return `http://${host}:3001/api`;
};

const api = axios.create({
  baseURL: getApiUrl(),
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
