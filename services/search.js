import apiClient from './client';

/**
 * Search events and venues via the backend search endpoint.
 * Accepts camelCase params and maps them to snake_case for the API.
 */
export async function fetchSearch({
  q,
  venueType,
  eventType,
  eventCategory,
  keywordCategory,
  startDate,
  endDate,
  minLat,
  maxLat,
  minLon,
  maxLon,
  returnType,
  skip = 0,
  limit = 100,
} = {}) {
  const params = { skip, limit };

  if (q) params.q = q;
  if (venueType) params.venue_type = venueType;
  if (eventType) params.event_type = eventType;
  if (eventCategory) params.event_category = eventCategory;
  if (keywordCategory) params.keyword_category = keywordCategory;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (minLat != null) params.min_lat = minLat;
  if (maxLat != null) params.max_lat = maxLat;
  if (minLon != null) params.min_lon = minLon;
  if (maxLon != null) params.max_lon = maxLon;
  if (returnType) params.return_type = returnType;

  const { data } = await apiClient.get('/search', { params });
  return data;
}
