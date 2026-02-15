import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchAllVenues } from '../api/venues';
import { fetchAllEvents } from '../api/events';
import { fetchNeighborhoods } from '../api/neighborhoods';
import { transformVenue, transformEvent, transformNeighborhood } from '../api/transformers';
import { assignDateTags } from '../utils/filtering';

export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const raw = await fetchAllVenues();
      return raw.map(transformVenue);
    },
  });
}

export function useEvents(venues) {
  const venueMap = useMemo(() => {
    if (!venues || venues.length === 0) return null;
    return new Map(venues.map((v) => [v.id, v]));
  }, [venues]);

  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const raw = await fetchAllEvents();
      const transformed = raw.map((e) => transformEvent(e, venueMap));
      return assignDateTags(transformed);
    },
    enabled: !!venueMap,
  });
}

export function useNeighborhoods() {
  return useQuery({
    queryKey: ['neighborhoods'],
    queryFn: async () => {
      const raw = await fetchNeighborhoods();
      return raw.map(transformNeighborhood);
    },
  });
}
