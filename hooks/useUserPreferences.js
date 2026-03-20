import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  followVenue,
  unfollowVenue,
  fetchFollowingVenues,
  fetchIsFollowing,
  saveEvent,
  unsaveEvent,
  fetchIsSaved,
  fetchSavedEvents,
  setInterests,
  fetchInterests,
  fetchNotificationFeed,
  fetchSettings,
  updateSettings,
  fetchMyReviews,
} from '../api/userPreferences';
import { transformVenue } from '../api/transformers';

// ── Venue follows ─────────────────────────────────────────────

export function useIsFollowingVenue(venueId) {
  return useQuery({
    queryKey: ['isFollowing', venueId],
    queryFn: () => fetchIsFollowing(venueId),
    enabled: !!venueId,
  });
}

export function useFollowedVenues() {
  return useQuery({
    queryKey: ['followedVenues'],
    queryFn: async () => {
      const raw = await fetchFollowingVenues();
      return raw.map(transformVenue);
    },
  });
}

export function useToggleFollowVenue(venueId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (isCurrentlyFollowing) => {
      if (isCurrentlyFollowing) {
        return unfollowVenue(venueId);
      }
      return followVenue(venueId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing', venueId] });
      queryClient.invalidateQueries({ queryKey: ['followedVenues'] });
      queryClient.invalidateQueries({ queryKey: ['notificationFeed'] });
    },
  });
}

// ── Saved events ──────────────────────────────────────────────

export function useIsEventSaved(eventId) {
  return useQuery({
    queryKey: ['isSaved', eventId],
    queryFn: () => fetchIsSaved(eventId),
    enabled: !!eventId,
  });
}

export function useToggleSaveEvent(eventId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (isCurrentlySaved) => {
      if (isCurrentlySaved) {
        return unsaveEvent(eventId);
      }
      return saveEvent(eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isSaved', eventId] });
      queryClient.invalidateQueries({ queryKey: ['savedEvents'] });
      queryClient.invalidateQueries({ queryKey: ['notificationFeed'] });
    },
  });
}

export function useSavedEvents() {
  return useQuery({
    queryKey: ['savedEvents'],
    queryFn: fetchSavedEvents,
  });
}

// ── Interests ─────────────────────────────────────────────────

export function useUserInterests() {
  return useQuery({
    queryKey: ['userInterests'],
    queryFn: fetchInterests,
  });
}

export function useSetInterests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setInterests,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userInterests'] });
      queryClient.invalidateQueries({ queryKey: ['notificationFeed'] });
    },
  });
}

// ── Notification feed ─────────────────────────────────────────

export function useNotificationFeed() {
  return useQuery({
    queryKey: ['notificationFeed'],
    queryFn: fetchNotificationFeed,
  });
}

// ── Settings ──────────────────────────────────────────────────

export function useUserSettings() {
  return useQuery({
    queryKey: ['userSettings'],
    queryFn: fetchSettings,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    },
  });
}

// ── My reviews ────────────────────────────────────────────────

export function useMyReviews() {
  return useQuery({
    queryKey: ['myReviews'],
    queryFn: fetchMyReviews,
  });
}
