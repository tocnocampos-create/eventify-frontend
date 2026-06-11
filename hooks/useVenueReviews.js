import { useQuery } from '@tanstack/react-query';
import { fetchVenueReviews } from '../services/reviews';
import { transformReview } from '../services/transformers';

/**
 * Fetch reviews for a venue from GET /api/reviews?venue_id=:id.
 * Returns transformed reviews with the frontend review shape.
 */
export function useVenueReviews(venueId) {
  return useQuery({
    queryKey: ['venueReviews', venueId],
    queryFn: async () => {
      const raw = await fetchVenueReviews(venueId);
      return raw.map(transformReview);
    },
    enabled: !!venueId,
  });
}
