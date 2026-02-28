import apiClient from './client';

// ── Venue follows ─────────────────────────────────────────────

export async function followVenue(venueId) {
  const { data } = await apiClient.post(`/me/venues/${venueId}/follow`);
  return data;
}

export async function unfollowVenue(venueId) {
  const { data } = await apiClient.delete(`/me/venues/${venueId}/follow`);
  return data;
}

export async function fetchFollowingVenues() {
  const { data } = await apiClient.get('/me/venues/following');
  return data;
}

export async function fetchIsFollowing(venueId) {
  const { data } = await apiClient.get(`/me/venues/${venueId}/is-following`);
  return data.following;
}

// ── Saved events ──────────────────────────────────────────────

export async function saveEvent(eventId) {
  const { data } = await apiClient.post(`/me/events/${eventId}/save`);
  return data;
}

export async function unsaveEvent(eventId) {
  const { data } = await apiClient.delete(`/me/events/${eventId}/save`);
  return data;
}

export async function fetchSavedEvents() {
  const { data } = await apiClient.get('/me/events/saved');
  return data;
}

export async function fetchIsSaved(eventId) {
  const { data } = await apiClient.get(`/me/events/${eventId}/is-saved`);
  return data.saved;
}

// ── Interests ─────────────────────────────────────────────────

export async function setInterests(interests) {
  const { data } = await apiClient.put('/me/interests', { interests });
  return data;
}

export async function fetchInterests() {
  const { data } = await apiClient.get('/me/interests');
  return data;
}

// ── Feed ──────────────────────────────────────────────────────

export async function fetchNotificationFeed() {
  const { data } = await apiClient.get('/me/feed');
  return data;
}
