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
    isSoldOut: apiEvent.is_sold_out || false,
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
    address: apiVenue.address || null,
    description: apiVenue.description || null,
    stars: apiVenue.stars ?? null,
    schedule: apiVenue.schedule || null,
    neighborhoodId: apiVenue.neighborhood_id || null,
  };
}

/**
 * Transform an API review to the frontend review shape.
 * @param {Object} apiReview - Review from the backend API
 */
export function transformReview(apiReview) {
  return {
    id: apiReview.id,
    user: apiReview.user_name || 'Anónimo',
    userId: apiReview.user_id || null,
    rating: apiReview.rating,
    comment: apiReview.comment || '',
    createdAt: apiReview.created_at || null,
  };
}

/**
 * Transform an API event product to the frontend shape.
 * @param {Object} apiProduct - Product from the backend API
 */
export function transformProduct(apiProduct) {
  return {
    id: apiProduct.id,
    title: apiProduct.title,
    price: apiProduct.price || null,
    image: apiProduct.image_url || null,
    url: apiProduct.purchase_url || null,
  };
}

/**
 * Transform an API community link to the frontend shape.
 * @param {Object} apiLink - Community link from the backend API
 */
export function transformCommunityLink(apiLink) {
  return {
    id: apiLink.id,
    platform: apiLink.platform,
    url: apiLink.url,
  };
}

/**
 * Transform an API event detail response to the frontend shape.
 * Composes transformEvent, transformVenue, and transformReview.
 * @param {Object} apiDetail - Detail response from GET /events/{id}/detail
 */
export function transformEventDetail(apiDetail) {
  const venue = apiDetail.venue ? transformVenue(apiDetail.venue) : null;
  const venueMap = venue ? new Map([[venue.id, venue]]) : new Map();
  const event = transformEvent(apiDetail.event || apiDetail, venueMap);
  const reviews = Array.isArray(apiDetail.reviews)
    ? apiDetail.reviews.map(transformReview)
    : [];

  const products = Array.isArray(apiDetail.products)
    ? apiDetail.products.map(transformProduct)
    : [];
  const communityLinks = Array.isArray(apiDetail.community_links)
    ? apiDetail.community_links.map(transformCommunityLink)
    : [];

  return {
    event,
    venue,
    reviews,
    averageRating: apiDetail.average_rating ?? null,
    reviewCount: apiDetail.review_count ?? 0,
    products,
    communityLinks,
  };
}

/**
 * Transform an API venue detail response to the frontend shape.
 * Composes transformVenue, transformEvent, and transformReview.
 * @param {Object} apiDetail - Detail response from GET /venues/{id}/detail
 */
export function transformVenueDetail(apiDetail) {
  const venue = transformVenue(apiDetail.venue || apiDetail);
  const venueMap = new Map([[venue.id, venue]]);
  const upcomingEvents = Array.isArray(apiDetail.upcoming_events)
    ? apiDetail.upcoming_events.map((e) => transformEvent(e, venueMap))
    : [];
  const pastEvents = Array.isArray(apiDetail.past_events)
    ? apiDetail.past_events.map((e) => transformEvent(e, venueMap))
    : [];
  const reviews = Array.isArray(apiDetail.reviews)
    ? apiDetail.reviews.map(transformReview)
    : [];

  return {
    venue,
    upcomingEvents,
    pastEvents,
    reviews,
    averageRating: apiDetail.average_rating ?? null,
    reviewCount: apiDetail.review_count ?? 0,
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
