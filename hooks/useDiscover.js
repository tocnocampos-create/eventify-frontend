import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchDiscover } from '../services/discover';
import { transformEvent, transformVenue } from '../services/transformers';
import { assignDateTags } from '../utils/filtering';
import { useAuth } from '../contexts/AuthContext';

function transformEventWithInlineVenue(apiEvent) {
  const venue = apiEvent.venue ? transformVenue(apiEvent.venue) : null;
  const venueMap = venue ? new Map([[venue.id, venue]]) : new Map();
  return transformEvent(apiEvent, venueMap);
}

function transformEventList(events) {
  return assignDateTags((events || []).map(transformEventWithInlineVenue));
}

export function useDiscover({ lat, lon, city, radiusKm } = {}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryResult = useQuery({
    queryKey: ['discover', { lat, lon, city, radiusKm, userId }],
    queryFn: () => fetchDiscover({ lat, lon, city, radiusKm }),
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(() => {
    if (!queryResult.data) return null;
    const raw = queryResult.data;

    return {
      trending: transformEventList(raw.trending),
      today: transformEventList(raw.today),
      thisWeek: transformEventList(raw.this_week),
      nearbyVenues: (raw.nearby_venues || []).map((item) => ({
        ...transformVenue(item.venue),
        distanceKm: item.distance_km,
      })),
      popularCategories: raw.popular_categories || [],
      forYou: raw.for_you ? transformEventList(raw.for_you) : null,
    };
  }, [queryResult.data]);

  return {
    data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
    isRefetching: queryResult.isRefetching,
  };
}
