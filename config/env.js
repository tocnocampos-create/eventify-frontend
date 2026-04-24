import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL = extra.apiBaseUrl || 'http://localhost:8000/api';
export const GOOGLE_MAPS_API_KEY = extra.googleMapsApiKey || '';
console.log('[env] GOOGLE_MAPS_API_KEY:', GOOGLE_MAPS_API_KEY);
export const GOOGLE_PLACES_API_KEY = extra.googlePlacesApiKey || '';
