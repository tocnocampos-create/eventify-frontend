import apiClient from './client';

export async function fetchVenueReviews(venueId, { skip = 0, limit = 50 } = {}) {
  const { data } = await apiClient.get('/reviews', { params: { venue_id: venueId, skip, limit } });
  return data;
}

export async function createReview({ rating, comment, venueId, eventId }) {
  const body = { rating, comment };
  if (venueId) body.venue_id = venueId;
  if (eventId) body.event_id = eventId;
  const { data } = await apiClient.post('/reviews', body);
  return data;
}
