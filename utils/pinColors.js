import { normalizeCategory } from './filters.schema.js';
import { normalizeVenueType } from './venueTypes.js';

// Pin colors
export const PIN_PURPLE = '#9F7BFF';
export const PIN_NAVY = '#5FA9FF';
export const PIN_NAVY_SELECTED = '#8BC4FF';
export const PIN_TEATRO = '#3B82F6';
export const PIN_COMEDIA = '#FF69B4';
export const PIN_ARTE = '#00BCD4';
export const PIN_CINE = '#3B52D8';
export const PIN_GREEN = '#22C55E';

// Emojis por tipo de venue
export const VENUE_TYPE_EMOJI = {
  Arena: '\u{1F3DF}\u{FE0F}',
  Stadium: '\u{1F3DF}\u{FE0F}',
  Theater: '\u{1F3AD}',
  Club: '\u{1F3B6}',
  Bar: '\u{1F378}',
  Cinema: '\u{1F3AC}',
  Art: '\u{1F5BC}\u{FE0F}',
  Gallery: '\u{1F5BC}\u{FE0F}',
  Museum: '\u{1F3DB}\u{FE0F}',
};

export const emojiForVenue = (type) => VENUE_TYPE_EMOJI[type] || '\u{1F4CD}';

// Category colors for UI
export const categoryColors = {
  'Música': '#6A3EF5',
  'Teatro': '#1E91E8',
  'Comedia': '#C814E1',
  'Arte': '#14D7D7',
  'Cine': '#003F9C',
};

export const getEventPinColor = (event) => {
  const category = normalizeCategory(event?.category);
  if (category === 'Teatro') return PIN_TEATRO;
  if (category === 'Comedia') return PIN_COMEDIA;
  if (category === 'Arte') return PIN_ARTE;
  if (category === 'Cine') return PIN_CINE;
  return PIN_PURPLE;
};

export const getVenuePinColor = (venueType) => {
  if (!venueType) return PIN_PURPLE;

  let normalizedType;
  try {
    normalizedType = normalizeVenueType(venueType, { allowLegacy: true });
  } catch (error) {
    normalizedType = venueType.trim();
  }

  if (normalizedType === 'Teatro') return PIN_TEATRO;
  if (normalizedType === 'Cine') return PIN_CINE;
  if (normalizedType === 'Museo' || normalizedType === 'Centro Cultural' || normalizedType === 'Galería') {
    return PIN_ARTE;
  }
  return PIN_PURPLE;
};

export const getCategoryBorderColor = (filterString) => {
  const category = filterString.split(' · ')[0];
  return categoryColors[category] || null;
};
