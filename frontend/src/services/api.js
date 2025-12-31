import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
api.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
});

export const login = (email, password) => api.post('/auth/login', { email, password });
export const verifyMfa = (userId, otp) => api.post('/auth/verify-mfa', { userId, otp });
export const register = (userData) => api.post('/auth/register', userData);
export const getQuestions = () => api.get('/questions');
export const createQuestion = (questionData) => api.post('/questions', questionData);
export const deleteQuestion = (id) => api.delete(`/questions/${id}`);
export const grantQuestionAccess = (id, payload) => api.post(`/questions/${id}/acl/grant`, payload);
export const revokeQuestionAccess = (id, payload) => api.post(`/questions/${id}/acl/revoke`, payload);

export const getUsers = () => api.get('/auth/users');
export const updateUserRole = (id, role) => api.put(`/auth/users/${id}/role`, { role });
export const getLogs = (params) => api.get('/logs', { params });

export default api;
