import { useQuery } from '@tanstack/react-query';
import { fetchVenueDetail, fetchAllVenues } from '../api/venues';
import { transformVenueDetail } from '../api/transformers';

/**
 * Fetches full venue detail (venue + events + reviews).
 *
 * When venueId is present it goes straight to GET /venues/:id/detail.
 * When only venueName is provided (legacy navigation from EventDetailScreen
 * where the venue relationship may not be loaded) it first resolves the ID
 * by searching all venues by name, then fetches the detail.
 */
export function useVenueDetail(venueId, venueName) {
  // Step 1 – resolve ID from name when venueId is missing
  const nameQuery = useQuery({
    queryKey: ['venueIdByName', venueName],
    queryFn: async () => {
      const venues = await fetchAllVenues();
      const needle = venueName.toLowerCase().trim();
      return (
        venues.find((v) => v.name.toLowerCase().trim() === needle) ||
        venues.find((v) => {
          const n = v.name.toLowerCase().trim();
          return n.includes(needle) || needle.includes(n);
        }) ||
        null
      );
    },
    enabled: !venueId && !!venueName,
  });

  const resolvedId = venueId || nameQuery.data?.id || null;

  // Step 2 – fetch detail once we have an ID
  const detailQuery = useQuery({
    queryKey: ['venueDetail', resolvedId],
    queryFn: async () => {
      const raw = await fetchVenueDetail(resolvedId);
      return transformVenueDetail(raw);
    },
    enabled: !!resolvedId,
  });

  return {
    ...detailQuery,
    isLoading: detailQuery.isLoading || nameQuery.isLoading,
    isError: detailQuery.isError || nameQuery.isError,
  };
}
