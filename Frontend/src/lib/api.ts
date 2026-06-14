import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        const apiKey = localStorage.getItem('user_openrouter_api_key');
        if (apiKey) {
            config.headers['X-User-API-Key'] = apiKey;
        }
        const apiModel = localStorage.getItem('user_openrouter_model');
        if (apiModel) {
            config.headers['X-User-Model'] = apiModel;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
