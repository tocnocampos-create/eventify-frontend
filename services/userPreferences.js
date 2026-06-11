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

// ── Settings ──────────────────────────────────────────────────

export async function fetchSettings() {
  const { data } = await apiClient.get('/me/settings');
  return data;
}

export async function updateSettings(settings) {
  const { data } = await apiClient.put('/me/settings', settings);
  return data;
}

// ── Venue visits (outdoor agenda) ─────────────────────────────

export async function saveVenueVisit(visitData) {
  const { data } = await apiClient.post('/me/venue-visits', visitData);
  return data;
}

export async function fetchVenueVisits() {
  const { data } = await apiClient.get('/me/venue-visits');
  return data;
}

export async function deleteVenueVisit(visitId) {
  const { data } = await apiClient.delete(`/me/venue-visits/${visitId}`);
  return data;
}

// ── My reviews ────────────────────────────────────────────────

export async function fetchMyReviews() {
  const { data } = await apiClient.get('/me/reviews');
  return data;
}
