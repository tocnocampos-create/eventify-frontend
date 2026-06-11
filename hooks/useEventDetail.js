import { useQuery } from '@tanstack/react-query';
import { fetchEventDetail } from '../services/events';
import { transformEventDetail } from '../services/transformers';

export function useEventDetail(eventId) {
  return useQuery({
    queryKey: ['eventDetail', eventId],
    queryFn: async () => {
      const raw = await fetchEventDetail(eventId);
      return transformEventDetail(raw);
    },
    enabled: !!eventId,
  });
}
