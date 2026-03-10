import apiClient from './client';

export async function fetchDiscover({ lat, lon, city, radiusKm } = {}) {
  const params = {};
  if (lat != null) params.lat = lat;
  if (lon != null) params.lon = lon;
  if (city) params.city = city;
  if (radiusKm != null) params.radius_km = radiusKm;

  const { data } = await apiClient.get('/discover', { params });
  return data;
}
