// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds (for AI generation which can take longer)
  headers: {
    'Content-Type': 'application/json',
  },
};

export default apiConfig;