import { useQuery } from '@tanstack/react-query';
import { fetchEventDetail } from '../api/events';
import { transformEventDetail } from '../api/transformers';

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
