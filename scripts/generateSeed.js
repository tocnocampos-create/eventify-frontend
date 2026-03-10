#!/usr/bin/env node

/**
 * Generates a Postgres seed file (db/seed.sql) using the existing frontend data.
 *
 * The seed contains:
 * - CREATE TABLE statements for neighborhoods, venues, events
 * - INSERT statements for all records in data/barrios.js, data/venues.js, data/events.js
 *
 * Assumptions:
 * - Neighborhood IDs are derived from their order (since frontend uses string IDs)
 * - Venue IDs follow their order in data/venues.js (after filtering active venues)
 * - Venue neighborhood assignment is determined by testing if a venue's coordinates fall within a barrio polygon
 * - Event venue assignment tries to match the location string with known venue names (best-effort)
 * - Missing optional fields (stars, schedule, type, keywords, price_range) default to NULL or empty arrays
 */

const fs = require('fs');
const path = require('path');

// Allow requiring project files that use ESM syntax
require('@babel/register')({
  extensions: ['.js'],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
  ignore: [/node_modules/],
});

// Stub static asset imports used inside the data files
['.png', '.jpg', '.jpeg', '.gif', '.webp'].forEach((ext) => {
  require.extensions[ext] = function stub(module, filename) {
    module.exports = filename;
  };
});

const barrios = require('../data/barrios').default;
const venues = require('../data/venues').default;
const events = require('../data/events').default;

const OUTPUT_PATH = path.join(__dirname, '..', 'db', 'seed.sql');

if (!fs.existsSync(path.dirname(OUTPUT_PATH))) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const escapeLiteral = (value) => {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
};

const formatFloatArray = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return "'{}'::double precision[]";
  }
  const cleaned = values
    .map((value) => {
      const num = toNumber(value);
      return num === null ? null : num;
    })
    .filter((value) => value !== null);

  if (cleaned.length === 0) {
    return "'{}'::double precision[]";
  }

  return `'{${cleaned.join(',')}}'::double precision[]`;
};

const formatCoordinatePairs = (pairs) => {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return "'{}'::double precision[]";
  }
  const rows = pairs
    .map((pair) => {
      if (!pair) return null;
      const lat = toNumber(pair.latitude ?? pair[0]);
      const lon = toNumber(pair.longitude ?? pair[1]);
      if (lat === null || lon === null) return null;
      return `{${lat},${lon}}`;
    })
    .filter(Boolean);

  if (rows.length === 0) {
    return "'{}'::double precision[]";
  }

  return `'{${
    rows.join(',')
  }}'::double precision[]`;
};

const formatTextArray = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return "'{}'";
  }
  const escaped = values.map((value) => {
    const sanitized = String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    return `"${sanitized}"`;
  });
  return `'{{${escaped.join(',')}}}'`.replace('{{', '{').replace('}}', '}');
};

const toTextArrayLiteral = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return "'{}'";
  }
  const escaped = values.map((value) => {
    const sanitized = String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    return `"${sanitized}"`;
  });
  return `'${`{${escaped.join(',')}}`}'`;
};

const normalizeString = (value) => {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

const pointInPolygon = (point, polygon) => {
  if (!point || !polygon?.length) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude <
        ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const neighborhoodRecords = barrios.map((barrio, index) => {
  const description = barrio.shortDescription || barrio.name || barrio.id;
  return {
    id: index + 1,
    slug: barrio.id,
    name: barrio.name || barrio.id,
    description,
    coordinates: barrio.coordinates || [],
    fillColor: barrio.fillColor || null,
    strokeColor: barrio.strokeColor || null,
    shortDescription: barrio.shortDescription || null,
    scheduleOpen: barrio.schedule?.open || null,
    scheduleClose: barrio.schedule?.close || null,
    keywords: barrio.keywords || [],
    photos: barrio.photos || [],
    recommendations: barrio.recommendations ? JSON.stringify(barrio.recommendations) : null,
  };
});

const neighborhoodPolygons = neighborhoodRecords.map((record, idx) => ({
  id: record.id,
  slug: barrios[idx].id,
  polygon: barrios[idx].coordinates || [],
}));

const findNeighborhoodIdForVenue = (venue) => {
  const coords = venue.coordinates;
  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    return null;
  }
  const match = neighborhoodPolygons.find((candidate) =>
    pointInPolygon(
      { latitude: coords.latitude, longitude: coords.longitude },
      candidate.polygon
    )
  );
  return match ? match.id : null;
};

const venueRecords = venues.map((venue, index) => {
  const coordinatesArray = venue.coordinates
    ? [venue.coordinates.latitude, venue.coordinates.longitude].filter(
        (value) => typeof value === 'number'
      )
    : [];

  return {
    id: index + 1,
    name: venue.name,
    type: venue.type || null,
    description: venue.description || null,
    stars: venue.stars ?? null,
    coordinates: coordinatesArray,
    schedule: venue.schedule || null,
    city: venue.city || null,
    coverImageUrl: typeof venue.coverImage === 'string' && venue.coverImage.startsWith('http') ? venue.coverImage : null,
    profileImageUrl: typeof venue.profileImage === 'string' && venue.profileImage.startsWith('http') ? venue.profileImage : null,
    websiteUrl: venue.websiteUrl || null,
    menuPdfUrl: venue.menuPdfUrl || null,
    neighborhoodId: findNeighborhoodIdForVenue(venue),
  };
});

const venueNameMap = new Map(
  venueRecords.map((record) => [normalizeString(record.name), record.id])
);

const findVenueIdForEvent = (location) => {
  if (!location) return null;
  const normalizedLocation = normalizeString(location);
  if (venueNameMap.has(normalizedLocation)) {
    return venueNameMap.get(normalizedLocation);
  }

  const commaParts = location.split(',').map((part) => part.trim());
  for (const part of commaParts) {
    const key = normalizeString(part);
    if (venueNameMap.has(key)) {
      return venueNameMap.get(key);
    }
  }

  return null;
};

const eventRecords = events.map((event, index) => {
  const venueId = findVenueIdForEvent(event.location);
  return {
    id: index + 1,
    venueId,
    name: event.title,
    type: event.type || null,
    category: event.category || null,
    keywords: event.keywords || [],
    description: event.description || null,
    priceRange: event.priceRange || event.price_range || [],
    date: event.date,
    timeStart: event.timeStart || null,
    timeEnd: event.timeEnd || null,
    imageUrl: event.image || null,
    url: event.url || null,
  };
});

const unmatchedVenues = venueRecords.filter((venue) => !venue.neighborhoodId);
const unmatchedEvents = eventRecords.filter((event) => !event.venueId);

if (unmatchedVenues.length) {
  console.warn(
    `[seed] ${unmatchedVenues.length} venues do not fall inside a known barrio polygon. ` +
      `Their neighborhood_id will be NULL.`
  );
}

if (unmatchedEvents.length) {
  console.warn(
    `[seed] ${unmatchedEvents.length} events could not be matched to a venue via the location string. ` +
      `Their venue_id will be NULL.`
  );
}

const lines = [];

lines.push('-- Auto-generated by scripts/generateSeed.js');
lines.push('BEGIN;');
lines.push('');
lines.push('DROP TABLE IF EXISTS events;');
lines.push('DROP TABLE IF EXISTS venues;');
lines.push('DROP TABLE IF EXISTS neighborhoods;');
lines.push('');
lines.push(`CREATE TABLE neighborhoods (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  coordinates DOUBLE PRECISION[] NOT NULL,
  fill_color VARCHAR(50),
  stroke_color VARCHAR(50),
  short_description TEXT,
  schedule_open VARCHAR(10),
  schedule_close VARCHAR(10),
  keywords TEXT[],
  photos TEXT[],
  recommendations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);
lines.push('');
lines.push(`CREATE TABLE venues (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  venue_type VARCHAR(50) NOT NULL DEFAULT '',
  description TEXT,
  stars DOUBLE PRECISION,
  coordinates DOUBLE PRECISION[] NOT NULL,
  schedule TIME,
  city VARCHAR(100),
  cover_image_url VARCHAR(500),
  profile_image_url VARCHAR(500),
  website_url VARCHAR(500),
  menu_pdf_url VARCHAR(500),
  neighborhood_id INTEGER REFERENCES neighborhoods(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (stars IS NULL OR (stars >= 0 AND stars <= 10))
);`);
lines.push('');
lines.push(`CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  venue_id INTEGER REFERENCES venues(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  category VARCHAR(100),
  keywords TEXT[],
  description TEXT,
  price_range DOUBLE PRECISION[],
  date VARCHAR(50) NOT NULL,
  time_start VARCHAR(10),
  time_end VARCHAR(10),
  image_url VARCHAR(500),
  url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);
lines.push('');

neighborhoodRecords.forEach((record) => {
  const values = [
    record.id,
    escapeLiteral(record.name),
    escapeLiteral(record.description),
    formatCoordinatePairs(record.coordinates),
    escapeLiteral(record.fillColor),
    escapeLiteral(record.strokeColor),
    escapeLiteral(record.shortDescription),
    escapeLiteral(record.scheduleOpen),
    escapeLiteral(record.scheduleClose),
    toTextArrayLiteral(record.keywords || []),
    toTextArrayLiteral(record.photos || []),
    escapeLiteral(record.recommendations),
  ];
  lines.push(
    `INSERT INTO neighborhoods (id, name, description, coordinates, fill_color, stroke_color, short_description, schedule_open, schedule_close, keywords, photos, recommendations) VALUES (${values.join(', ')});`
  );
});

lines.push('');

venueRecords.forEach((venue) => {
  const values = [
    venue.id,
    venue.neighborhoodId === null ? 'NULL' : venue.neighborhoodId,
    escapeLiteral(venue.name),
    escapeLiteral(venue.type || ''),
    escapeLiteral(venue.description),
    venue.stars == null ? 'NULL' : venue.stars,
    formatFloatArray(venue.coordinates),
    venue.schedule ? escapeLiteral(venue.schedule) : 'NULL',
    escapeLiteral(venue.city),
    escapeLiteral(venue.coverImageUrl),
    escapeLiteral(venue.profileImageUrl),
    escapeLiteral(venue.websiteUrl),
    escapeLiteral(venue.menuPdfUrl),
  ];

  lines.push(
    `INSERT INTO venues (id, neighborhood_id, name, venue_type, description, stars, coordinates, schedule, city, cover_image_url, profile_image_url, website_url, menu_pdf_url) VALUES (${values.join(', ')});`
  );
});

lines.push('');

eventRecords.forEach((event) => {
  const values = [
    event.id,
    event.venueId === null ? 'NULL' : event.venueId,
    escapeLiteral(event.name),
    escapeLiteral(event.type),
    escapeLiteral(event.category),
    toTextArrayLiteral(event.keywords || []),
    escapeLiteral(event.description),
    formatFloatArray(event.priceRange || []),
    escapeLiteral(event.date),
    escapeLiteral(event.timeStart),
    escapeLiteral(event.timeEnd),
    escapeLiteral(event.imageUrl),
    escapeLiteral(event.url),
  ];

  lines.push(
    `INSERT INTO events (id, venue_id, name, type, category, keywords, description, price_range, date, time_start, time_end, image_url, url) VALUES (${values.join(', ')});`
  );
});

lines.push('');
lines.push('COMMIT;');

fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf8');

console.log(`[seed] SQL seed written to ${path.relative(process.cwd(), OUTPUT_PATH)}`);

