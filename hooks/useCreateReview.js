import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReview } from '../api/reviews';

export function useCreateReview({ venueId, eventId } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      if (venueId) queryClient.invalidateQueries({ queryKey: ['venueDetail', venueId] });
      if (eventId) queryClient.invalidateQueries({ queryKey: ['eventDetail', eventId] });
    },
  });
}
