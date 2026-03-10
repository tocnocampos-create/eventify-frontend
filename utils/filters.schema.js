// utils/filters.schema.js

// Tags de fecha que usa la UI
export const DATE_TAGS = ["Live", "Today", "This Week", "This Month", "ALL"];

// Mapeo de categorías (acepta español/variantes -> canonical en español)
export const CATEGORY_MAP = {
  // canonical
  "music": "Música",
  "theater": "Teatro",
  "humor": "Comedia",
  "art": "Arte",
  "cinema": "Cine",
  // english variants
  "Music": "Música",
  "Theater": "Teatro",
  "Comedy": "Comedia",
  "Humor": "Comedia",
  "Art": "Arte",
  "Cinema": "Cine",
  // spanish/sin acento
  "musica": "Música",
  "música": "Música",
  "mísica": "Música",
  "teatro": "Teatro",
  "comedia": "Comedia",
  "arte": "Arte",
  "cine": "Cine",
};

// Subcategorías en ESPAÑOL (hardcoded fallback — backend /config endpoint is the source of truth)
export const SUBCATEGORIES = {
  'Música': ['Jazz','Vida Nocturna','Rock','Electrónica','Pop','Folclore','Latina','Indie'],
  'Teatro': ['Drama','Comedia','Danza-Ballet','Musical','Familiar'],
  'Comedia': [],
  'Arte': ['Museos','Centro Cultural','Galerías'],
  'Cine': ['Acción','Drama','Terror','Comedia','Romántica','Familiar'],
};

/**
 * Build subcategories map from backend config categories.
 * Falls back to hardcoded SUBCATEGORIES if config is not available.
 * @param {Array|undefined} configCategories - categories array from /config endpoint
 * @returns {Object} map of category name to subcategories array
 */
export function buildSubcategoriesFromConfig(configCategories) {
  if (!configCategories || !Array.isArray(configCategories)) return SUBCATEGORIES;
  const map = {};
  configCategories.forEach(c => { map[c.name] = c.subcategories || []; });
  return Object.keys(map).length > 0 ? map : SUBCATEGORIES;
}

// Mapeo de inglés a español para tipos de eventos en los datos
// Este mapa normaliza todos los tipos a los valores canónicos en español
export const TYPE_EN_TO_ES_MAP = {
  // Música
  'Jazz': 'Jazz',
  'Latin': 'Latina',
  'Rock': 'Rock',
  'Electronic': 'Electrónica',
  'Electrónica': 'Electrónica',
  'Pop': 'Pop',
  'Folk': 'Folclore',
  'Folklore': 'Folclore',
  'Folclore': 'Folclore',
  'Indie': 'Indie',
  'Nightlife': 'Vida Nocturna',
  'Vida Nocturna': 'Vida Nocturna',
  // Teatro
  'Drama': 'Drama',
  'Comedy': 'Comedia', // En contexto de Teatro
  'Dance-Ballet': 'Danza-Ballet',
  'Danza-Ballet': 'Danza-Ballet',
  'Musical': 'Musical',
  'Kids': 'Familiar',
  'Familiar': 'Familiar',
  // Comedia (vacío según especificación)
  'Stand-Up': 'Stand-Up', // Mantener como está si no hay tipo canónico
  'Stand-up': 'Stand-Up',
  'Podcast': 'Stand-Up',
  // Arte
  'Museums': 'Museos',
  'Museos': 'Museos',
  'Art Galleries': 'Galerías',
  'Galerías': 'Galerías',
  'Centro Cultural': 'Centro Cultural',
  'Painting': 'Galerías',
  'Sculpture': 'Galerías',
  'Photography': 'Galerías',
  // Cine
  'Action': 'Acción',
  'Acción': 'Acción',
  'Thriller': 'Terror',
  'Terror': 'Terror',
  'Romantic': 'Romántica',
  'Romántica': 'Romántica',
  // Casos especiales/misc - mapear a tipos canónicos más cercanos
  'Magia/Comedia': 'Comedia', // Teatro
  'Techno Erotico': 'Electrónica', // Música
  'Classic': 'Folclore', // Música clásica se mapea a Folclore
  'Hip Hop': 'Latina', // Música
  'Reggae': 'Latina', // Música - mapear a Latina como más cercano
};

// Función para normalizar tipo de evento de inglés a español
export function normalizeEventType(type) {
  if (!type) return undefined;
  return TYPE_EN_TO_ES_MAP[type] || type;
}

// Legacy: mantener compatibilidad con código que usa CATEGORY_TYPES en inglés
// Mapea categorías en inglés a sus tipos en español (canonical)
export const CATEGORY_TYPES = {
  Music: ["Jazz", "Vida Nocturna", "Rock", "Electrónica", "Pop", "Folclore", "Latina", "Indie"],
  Música: ["Jazz", "Vida Nocturna", "Rock", "Electrónica", "Pop", "Folclore", "Latina", "Indie"],
  Theater: ["Drama", "Comedia", "Danza-Ballet", "Musical", "Familiar"],
  Teatro: ["Drama", "Comedia", "Danza-Ballet", "Musical", "Familiar"],
  Humor: [],
  Comedia: [],
  Art: ["Museos", "Centro Cultural", "Galerías"],
  Arte: ["Museos", "Centro Cultural", "Galerías"],
  Cinema: ["Acción", "Drama", "Terror", "Comedia", "Romántica", "Familiar"],
  Cine: ["Acción", "Drama", "Terror", "Comedia", "Romántica", "Familiar"],
};

// Utilidades
export function stripAccents(s) {
  return typeof s === "string" ? s.normalize("NFD").replace(/\p{Diacritic}/gu, "") : s;
}

export function normalizeCategory(input) {
  if (!input) return undefined;
  const key = stripAccents(String(input).trim().toLowerCase());
  return CATEGORY_MAP[key] || (
    ["music","theater","humor","art","cinema"].includes(key) ? CATEGORY_MAP[key] : undefined
  );
}
