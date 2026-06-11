import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchAllVenues, fetchVenuesByType } from '../services/venues';
import { fetchAllEvents } from '../services/events';
import { fetchNeighborhoods } from '../services/neighborhoods';
import { transformVenue, transformEvent, transformNeighborhood } from '../services/transformers';
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

const MUSEUM_TYPES = ['Museo', 'Centro Cultural', 'Galería', 'Galeria'];

export function useMuseumVenues(isActive) {
  return useQuery({
    queryKey: ['museumVenues'],
    queryFn: async () => {
      const raw = await fetchVenuesByType(MUSEUM_TYPES);
      return raw.map((v) => ({
        ...transformVenue(v),
        upcomingEvents: v.upcoming_events ?? 0,
      }));
    },
    enabled: !!isActive,
    staleTime: 5 * 60 * 1000,
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
