import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

// EXPO_PUBLIC_* vars are inlined by Metro at bundle time — reliable fallback for web exports
export const API_BASE_URL =
  extra.apiBaseUrl ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://localhost:8000/api';

export const GOOGLE_MAPS_API_KEY =
  extra.googleMapsApiKey ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

export const GOOGLE_PLACES_API_KEY =
  extra.googlePlacesApiKey ||
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
  '';
