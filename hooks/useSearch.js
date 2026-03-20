import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchSearch } from '../api/search';
import { transformEvent, transformVenue } from '../api/transformers';
import { assignDateTags } from '../utils/filtering';

/**
 * Hook for the backend search endpoint.
 * Only fires when at least one filter param is provided.
 */
export function useSearch(params = {}) {
  const hasFilter = useMemo(() => {
    const { q, venueType, eventType, eventCategory, keywordCategory, startDate, endDate, minLat, maxLat, minLon, maxLon } = params;
    return !!(q || venueType || eventType || eventCategory || keywordCategory || startDate || endDate || minLat != null || maxLat != null || minLon != null || maxLon != null);
  }, [params]);

  return useQuery({
    queryKey: ['search', params],
    queryFn: async () => {
      const raw = await fetchSearch(params);
      const venues = (raw.venues || []).map(transformVenue);
      const venueMap = new Map(venues.map((v) => [v.id, v]));
      const events = assignDateTags(
        (raw.events || []).map((e) => transformEvent(e, venueMap))
      );
      return { venues, events, meta: raw.meta || null };
    },
    enabled: hasFilter,
  });
}
