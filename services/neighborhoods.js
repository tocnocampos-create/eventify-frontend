import apiClient from './client';

export async function fetchNeighborhoods() {
  const { data } = await apiClient.get('/neighborhoods', {
    params: { skip: 0, limit: 1000 },
  });
  return data;
}
