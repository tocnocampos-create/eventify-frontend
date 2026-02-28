import apiClient from './client';

export async function createReview({ rating, comment, venueId, eventId }) {
  const body = { rating, comment };
  if (venueId) body.venue_id = venueId;
  if (eventId) body.event_id = eventId;
  const { data } = await apiClient.post('/reviews', body);
  return data;
}
