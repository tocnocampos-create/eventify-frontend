import apiClient from './client';

export const fetchConfig = async () => {
  const { data } = await apiClient.get('/config');
  return data;
};
