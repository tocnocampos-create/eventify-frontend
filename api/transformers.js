/**
 * Transform backend API responses to the shapes the frontend UI expects.
 */

/**
 * Transform an API event to the frontend event shape.
 * @param {Object} apiEvent - Event from the backend API
 * @param {Map} venueMap - Map of venue ID → transformed venue object
 */
export function transformEvent(apiEvent, venueMap) {
  const venue = apiEvent.venue_id ? venueMap.get(apiEvent.venue_id) : null;
  const location = venue
    ? venue.city
      ? `${venue.name}, ${venue.city}`
      : venue.name
    : null;

  return {
    id: apiEvent.id,
    title: apiEvent.name,
    category: apiEvent.category || null,
    type: apiEvent.type || null,
    date: apiEvent.date || null,
    dateTag: null, // assigned dynamically by assignDateTags
    timeStart: apiEvent.time_start || null,
    timeEnd: apiEvent.time_end || null,
    location,
    venueName: venue?.name || null,
    description: apiEvent.description || null,
    url: apiEvent.url || null,
    image: apiEvent.image_url || null,
    price: apiEvent.price_range?.[0] ?? null,
    priceRange: apiEvent.price_range || null,
    keywords: apiEvent.keywords || [],
    coordinates: venue?.coordinates || null,
  };
}

/**
 * Transform an API venue to the frontend venue shape.
 * @param {Object} apiVenue - Venue from the backend API
 */
export function transformVenue(apiVenue) {
  const coords =
    Array.isArray(apiVenue.coordinates) && apiVenue.coordinates.length === 2
      ? { latitude: apiVenue.coordinates[0], longitude: apiVenue.coordinates[1] }
      : null;

  return {
    id: apiVenue.id,
    name: apiVenue.name,
    type: apiVenue.venue_type || null,
    city: apiVenue.city || null,
    coordinates: coords,
    coverImage: apiVenue.cover_image_url || null,
    profileImage: apiVenue.profile_image_url || null,
    websiteUrl: apiVenue.website_url || null,
    menuPdfUrl: apiVenue.menu_pdf_url || null,
    description: apiVenue.description || null,
    stars: apiVenue.stars ?? null,
    schedule: apiVenue.schedule || null,
    neighborhoodId: apiVenue.neighborhood_id || null,
  };
}

/**
 * Transform an API neighborhood to the frontend barrio shape.
 * @param {Object} apiNeighborhood - Neighborhood from the backend API
 */
export function transformNeighborhood(apiNeighborhood) {
  const coordinates = Array.isArray(apiNeighborhood.coordinates)
    ? apiNeighborhood.coordinates.map((pair) => ({
        latitude: pair[0],
        longitude: pair[1],
      }))
    : [];

  let recommendations = apiNeighborhood.recommendations || null;
  if (typeof recommendations === 'string') {
    try {
      recommendations = JSON.parse(recommendations);
    } catch {
      recommendations = null;
    }
  }

  return {
    id: apiNeighborhood.id,
    name: apiNeighborhood.name,
    coordinates,
    fillColor: apiNeighborhood.fill_color || 'rgba(159, 123, 255, 0.2)',
    strokeColor: apiNeighborhood.stroke_color || 'rgba(159, 123, 255, 0.6)',
    photos: apiNeighborhood.photos || [],
    schedule: apiNeighborhood.schedule_open
      ? { open: apiNeighborhood.schedule_open, close: apiNeighborhood.schedule_close }
      : null,
    keywords: apiNeighborhood.keywords || [],
    shortDescription: apiNeighborhood.short_description || apiNeighborhood.description || '',
    description: apiNeighborhood.description || '',
    recommendations: recommendations || [],
  };
}
