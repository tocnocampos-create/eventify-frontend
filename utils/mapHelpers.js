import { Platform } from 'react-native';
import dayjs from 'dayjs';

// Map region defaults
export const DEFAULT_MAP_REGION = {
  latitude: -33.4489,
  longitude: -70.6693,
  latitudeDelta: 0.0027,
  longitudeDelta: 0.0027,
};

export const DEFAULT_NATIVE_REGION = {
  latitude: -33.4489,
  longitude: -70.6693,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Zoom constants
export const CITY_ZOOM_DELTA = 0.0027;
export const STREET_ZOOM_DELTA_WEB = 0.002;
export const STREET_ZOOM_DELTA_NATIVE = 0.008;
export const STREET_ZOOM_RELAX_FACTOR = 1.7;
export const PIN_ZOOM_OUT_DELTA_WEB = 0.0008;
export const PIN_ZOOM_OUT_DELTA_NATIVE = 0.004;
export const CAROUSEL_ZOOM_DELTA_WEB = 0.0005;
export const CAROUSEL_ZOOM_DELTA_NATIVE = 0.003;
export const PIN_VERTICAL_OFFSET_FACTOR = 0.22;

export const getStreetZoomDelta = () =>
  Platform.OS === 'web' ? STREET_ZOOM_DELTA_WEB : STREET_ZOOM_DELTA_NATIVE;

export const getPinZoomOutDelta = () =>
  Platform.OS === 'web' ? PIN_ZOOM_OUT_DELTA_WEB : PIN_ZOOM_OUT_DELTA_NATIVE;

export const getCarouselZoomDelta = () =>
  Platform.OS === 'web' ? CAROUSEL_ZOOM_DELTA_WEB : CAROUSEL_ZOOM_DELTA_NATIVE;

// Format helpers
export const formatEventDateTime = (e) => {
  const d = e?.date ? dayjs(e.date) : null;
  if (!d || !d.isValid()) return '';

  // Expositions with a date range: "DD MMM – DD MMM YYYY"
  if (e?.type === 'Exposición' && e?.dateEnd) {
    const dEnd = dayjs(e.dateEnd);
    if (dEnd.isValid()) {
      return `${d.format('DD MMM')} – ${dEnd.format('DD MMM YYYY')}`;
    }
  }

  const datePart = d.format('DD MMM YYYY');
  const timePart = e?.timeStart ? e.timeStart : null;
  return timePart ? `${datePart} · ${timePart}` : datePart;
};

export const getEventPrice = (event) => {
  if (event?.price == null) return null;
  if (typeof event.price === 'number') return event.price;
  if (typeof event.price === 'string') {
    const cleaned = event.price.replace(/[.,$]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
};

export const formatPrice = (price) => {
  if (price == null) return null;
  if (price === 0) return 'Gratis';
  return `$ ${Math.round(price).toLocaleString('es-CL')}`;
};
