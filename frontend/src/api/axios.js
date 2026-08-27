// frontend/src/api/axios.js
import axios from 'axios';

// ===== FIX: Use the API URL with /api included =====
// VITE_API_URL should be the full base URL including /api
// Example: https://antiakinator.onrender.com/api
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ===== CSRF TOKEN HELPER =====
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// ===== SECURE CONNECTION CHECK =====
function isSecureConnection() {
  if (typeof window === 'undefined') return true;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return true;
  }
  return window.location.protocol === 'https:';
}

// ===== CREATE AXIOS INSTANCE =====
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  withCredentials: true,
  timeout: 30000,
  maxContentLength: 10 * 1024 * 1024
});

// ===== REQUEST INTERCEPTOR =====
api.interceptors.request.use(
  (config) => {
    // ===== Check secure connection =====
    if (!isSecureConnection() && process.env.NODE_ENV === 'production') {
      if (typeof window !== 'undefined') {
        window.location.href = window.location.href.replace('http://', 'https://');
      }
    }

    // ===== Add token =====
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ===== Add CSRF token =====
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      const csrfToken = getCookie('XSRF-TOKEN') || getCookie('csrf_token');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    // ===== Cache busting - ONLY for specific endpoints =====
    const skipCacheEndpoints = ['/team/room', '/team/join', '/team/create'];
    const shouldSkipCache = skipCacheEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    if (config.method?.toLowerCase() === 'get' && !shouldSkipCache) {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===== RESPONSE INTERCEPTOR =====
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // ===== Network errors =====
    if (!error.response) {
      return Promise.reject({
        ...error,
        message: 'Network error. Please check your connection.'
      });
    }

    // ===== Timeout errors =====
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        ...error,
        message: 'Request timeout. Please try again.'
      });
    }

    // ===== 401 Unauthorized =====
    if (error.response?.status === 401) {
      // Don't redirect on login/register pages
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/register') &&
          !window.location.pathname.includes('/verify-otp')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        // Optional: redirect to login
        // window.location.href = '/login';
      }
    }

    // ===== 429 Rate Limiting =====
    if (error.response?.status === 429) {
      console.warn('⏰ Rate limit exceeded:', error.response?.data?.message);
    }

    // ===== Sanitize error =====
    const sanitizedError = {
      ...error,
      message: error.response?.data?.message || error.message || 'An error occurred',
      data: error.response?.data || null,
      status: error.response?.status || null
    };

    return Promise.reject(sanitizedError);
  }
);

// ===== HELPERS =====
api.clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  delete api.defaults.headers.common['Authorization'];
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=Strict;';
};

api.setAuth = (token) => {
  localStorage.setItem('token', token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

api.isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

api.isSecure = () => {
  return isSecureConnection();
};

// ===== GET USER INFO =====
api.getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
};

// ===== GET TOKEN =====
api.getToken = () => {
  return localStorage.getItem('token');
};

export default api;