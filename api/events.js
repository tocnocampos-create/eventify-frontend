import apiClient from './client';

const MAX_PER_PAGE = 1000;

export async function fetchEvents({ skip = 0, limit = MAX_PER_PAGE } = {}) {
  const { data } = await apiClient.get('/events', { params: { skip, limit } });
  return data;
}

export async function fetchAllEvents() {
  const results = [];
  let skip = 0;

  while (true) {
    const batch = await fetchEvents({ skip, limit: MAX_PER_PAGE });
    results.push(...batch);
    if (batch.length < MAX_PER_PAGE) break;
    skip += MAX_PER_PAGE;
  }

  return results;
}
