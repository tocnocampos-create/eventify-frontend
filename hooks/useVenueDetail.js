import { useQuery } from '@tanstack/react-query';
import { fetchVenueDetail } from '../api/venues';
import { transformVenueDetail } from '../api/transformers';

export function useVenueDetail(venueId) {
  return useQuery({
    queryKey: ['venueDetail', venueId],
    queryFn: async () => {
      const raw = await fetchVenueDetail(venueId);
      return transformVenueDetail(raw);
    },
    enabled: !!venueId,
  });
}
