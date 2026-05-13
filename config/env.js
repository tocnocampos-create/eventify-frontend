import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL = extra.apiBaseUrl || 'http://localhost:8000/api';
export const GOOGLE_MAPS_API_KEY = extra.googleMapsApiKey || '';
export const GOOGLE_PLACES_API_KEY = extra.googlePlacesApiKey || '';
