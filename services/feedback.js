import apiClient from './client';

export async function submitFeedback(message) {
  const { data } = await apiClient.post('/feedback', { message });
  return data;
}
