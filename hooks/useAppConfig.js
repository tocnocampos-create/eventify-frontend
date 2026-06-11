import { useQuery } from '@tanstack/react-query';
import { fetchConfig } from '../services/config';

export function useAppConfig() {
  return useQuery({
    queryKey: ['appConfig'],
    queryFn: fetchConfig,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function getCategoryColors(categories) {
  if (!categories) return {};
  const map = {};
  categories.forEach(c => { map[c.name] = c.color; });
  return map;
}

export function getCategoryBadgeColors(categories) {
  if (!categories) return {};
  const map = {};
  categories.forEach(c => { map[c.name] = c.badge_color; });
  return map;
}

export function getCategoryIcons(categories) {
  if (!categories) return {};
  const map = {};
  categories.forEach(c => { map[c.name] = c.icon; });
  return map;
}

export function getSubcategories(categories) {
  if (!categories) return {};
  const map = {};
  categories.forEach(c => { map[c.name] = c.subcategories || []; });
  return map;
}

export function getCategoryNames(categories) {
  if (!categories) return [];
  return categories.map(c => c.name);
}
