import apiClient from './client';

export const loginApi = async ({ email, password }) => {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
};

export const registerApi = async ({ email, full_name, password }) => {
  const { data } = await apiClient.post('/auth/register', { email, full_name, password });
  return data;
};

export const fetchMe = async () => {
  const { data } = await apiClient.get('/auth/me');
  return data;
};

export const refreshTokenApi = async (refresh_token) => {
  const { data } = await apiClient.post('/auth/refresh', { refresh_token });
  return data;
};

export const forgotPasswordApi = async ({ email }) => {
  const { data } = await apiClient.post('/auth/forgot-password', { email });
  return data;
};

export const resetPasswordApi = async ({ email, code, new_password }) => {
  const { data } = await apiClient.post('/auth/reset-password', { email, code, new_password });
  return data;
};
