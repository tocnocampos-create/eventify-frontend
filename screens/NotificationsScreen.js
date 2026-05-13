// screens/NotificationScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import useDragScroll from '../hooks/useDragScroll';
import { LinearGradient } from 'expo-linear-gradient';
import TabScreenLayout from '../components/TabScreenLayout';
import GlassOverlay from '../components/home/GlassOverlay';
import {
  Calendar,
  MapPin,
  Bell,
  Star,
  ChevronRight,
  Bookmark,
} from 'lucide-react-native';
import colors from '../theme/colors';
import { categoryColors } from '../utils/pinColors';
import { normalizeCategory } from '../utils/filters.schema';
import { useNotificationFeed, useFollowedVenues } from '../hooks/useUserPreferences';
import { useAppConfig, getCategoryBadgeColors } from '../hooks/useAppConfig';
import { useNotificationsUnread } from '../hooks/useNotificationsUnread';

const RECS_PAGE_SIZE = 7;

import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

/** Transform a raw backend event to frontend shape for display */
function toFrontendEvent(apiEvent) {
  return {
    id: apiEvent.id,
    title: apiEvent.name,
    category: apiEvent.category || null,
    type: apiEvent.type || null,
    date: apiEvent.date || null,
    timeStart: apiEvent.time_start || null,
    image: apiEvent.image_url || null,
    price: apiEvent.price_range?.[0] ?? null,
    location: null,
    venue_id: apiEvent.venue_id,
    matchScore: apiEvent.match_score ?? 0,
  };
}

/** Sort recommendations: match score DESC first, then date ASC */
function sortRecommendations(events) {
  return [...events].sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    const da = a.date ? dayjs(a.date).valueOf() : Infinity;
    const db = b.date ? dayjs(b.date).valueOf() : Infinity;
    return da - db;
  });
}

function formatEventDateTime(event) {
  const d = event?.date ? dayjs(event.date) : null;
  if (!d || !d.isValid()) return '';
  const datePart = d.format('D [de] MMMM');
  return event?.timeStart ? `${datePart}, ${event.timeStart}` : datePart;
}

export default function NotificationScreen({ navigation }) {
  const dragRef = useDragScroll();
  const { data: config } = useAppConfig();
  const badgeColors = getCategoryBadgeColors(config?.categories);
  const { data: feed, isLoading } = useNotificationFeed();
  const { data: followedVenues = [], isLoading: followedVenuesLoading } = useFollowedVenues();
  const { markRead } = useNotificationsUnread();
  const [showAllRecs, setShowAllRecs] = useState(false);

  // Mark notifications as read whenever this screen is open and data is available
  useEffect(() => {
    if (feed) markRead();
  }, [feed]);

  const savedEvents = (feed?.saved_events || []).map(toFrontendEvent);
  const followedVenueEvents = feed?.followed_venue_events || {};
  const allRecommendedEvents = sortRecommendations(
    (feed?.recommended_events || []).map(toFrontendEvent)
  );
  const hasMoreRecs = allRecommendedEvents.length > RECS_PAGE_SIZE;
  const recommendedEvents = showAllRecs ? allRecommendedEvents : allRecommendedEvents.slice(0, RECS_PAGE_SIZE);

  const renderEventCard = (event) => {
    const category = normalizeCategory(event?.category);
    const catColor = categoryColors[category] || colors.primary;
    const badgeBg = badgeColors[category] || 'rgba(159, 123, 255, 0.2)';

    return (
      <TouchableOpacity
        key={event.id}
        style={styles.eventCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('EventDetail', { event })}
      >
        {event.image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: event.image }} style={styles.image} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(15, 5, 35, 0.85)']}
              style={StyleSheet.absoluteFillObject}
            />
            {category && (
              <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                <Text style={styles.badgeText}>{category}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            {category && (
              <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                <Text style={styles.badgeText}>{category}</Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.metaRow}>
            <Calendar size={13} color={colors.textDim} />
            <Text style={styles.metaText}>{formatEventDateTime(event)}</Text>
          </View>
          {!!event.location && (
            <View style={styles.metaRow}>
              <MapPin size={13} color={colors.textDim} />
              <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
            </View>
          )}
        </View>
        <LinearGradient
          colors={[catColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomAccent}
        />
      </TouchableOpacity>
    );
  };

  const renderHorizontalCard = ({ item: rawEvent }) => {
    const event = toFrontendEvent(rawEvent);
    const category = normalizeCategory(event?.category);
    const catColor = categoryColors[category] || colors.primary;
    const badgeBg = badgeColors[category] || 'rgba(159, 123, 255, 0.2)';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('EventDetail', { event })}
        style={styles.smallCard}
        activeOpacity={0.9}
      >
        <View style={styles.smallImageContainer}>
          {event.image ? (
            <Image source={{ uri: event.image }} style={styles.smallImage} resizeMode="cover" />
          ) : (
            <View style={[styles.smallImage, { backgroundColor: colors.card }]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(15, 5, 35, 0.7)']}
            style={StyleSheet.absoluteFillObject}
          />
          {category && (
            <View style={[styles.smallBadge, { backgroundColor: badgeBg }]}>
              <Text style={styles.badgeText}>{category}</Text>
            </View>
          )}
        </View>
        <View style={styles.smallCardContent}>
          <Text style={styles.smallTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.metaRow}>
            <Calendar size={11} color={colors.textDim} />
            <Text style={styles.smallMeta}>{formatEventDateTime(event)}</Text>
          </View>
        </View>
        <LinearGradient
          colors={[catColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.smallAccent}
        />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <TabScreenLayout style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </TabScreenLayout>
    );
  }

  return (
    <TabScreenLayout style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Section: Mis Planes (saved events) */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconRow}>
            <Bookmark size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Mis Planes</Text>
          </View>
        </View>
        {savedEvents.length > 0 ? (
          savedEvents.map((event) => renderEventCard(event))
        ) : (
          <GlassOverlay borderRadius={12} style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No tienes planes guardados</Text>
            <Text style={styles.emptySubtitle}>Guarda eventos que te interesen.</Text>
          </GlassOverlay>
        )}

        {/* Section: En Mis Venues */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconRow}>
            <Star size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>En Mis Venues</Text>
          </View>
        </View>
        {followedVenuesLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
        ) : followedVenues.length > 0 ? (
          followedVenues.map((venue) => {
            const venueEvents = followedVenueEvents[venue.name] || [];
            return (
              <View key={venue.id} style={styles.venueSection}>
                <TouchableOpacity
                  style={styles.venueHeader}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate('VenueScreen', {
                      venueId: venue.id,
                      venueName: venue.name,
                      venueType: venue.type,
                      venueCity: venue.city,
                      coverImage: venue.coverImage,
                      profileImage: venue.profileImage,
                      menuPdfUrl: venue.menuPdfUrl,
                    })
                  }
                >
                  <MapPin size={14} color={colors.textDim} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.venueTitle}>{venue.name}</Text>
                    {(venue.type || venue.city) && (
                      <Text style={styles.venueMeta}>
                        {[venue.type, venue.city].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={14} color={colors.textDim} />
                </TouchableOpacity>
                {venueEvents.length > 0 && (
                  <FlatList
                    ref={dragRef}
                    horizontal
                    data={venueEvents}
                    renderItem={renderHorizontalCard}
                    keyExtractor={(item) => item.id.toString()}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                  />
                )}
              </View>
            );
          })
        ) : (
          <GlassOverlay borderRadius={12} style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aún no sigues ningún venue</Text>
            <Text style={styles.emptySubtitle}>Explora venues y sigue tus favoritos.</Text>
          </GlassOverlay>
        )}

        {/* Section: Recomendaciones */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconRow}>
            <Bell size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Recomendaciones</Text>
          </View>
        </View>
        {allRecommendedEvents.length > 0 ? (
          <>
            {recommendedEvents.map((event) => renderEventCard(event))}
            {hasMoreRecs && !showAllRecs && (
              <TouchableOpacity
                style={styles.verMasButton}
                onPress={() => setShowAllRecs(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.verMasText}>
                  Ver más ({allRecommendedEvents.length - RECS_PAGE_SIZE} más)
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <GlassOverlay borderRadius={12} style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin recomendaciones aún</Text>
            <Text style={styles.emptySubtitle}>Selecciona intereses para recibir sugerencias personalizadas.</Text>
          </GlassOverlay>
        )}
      </ScrollView>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  scrollView: {
    flex: 1,
  },

  // Section headers
  sectionHeader: {
    marginTop: 18,
    marginBottom: 12,
  },
  sectionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    color: colors.text,
    fontFamily: 'Outfit_700Bold',
  },

  // Venue sections
  venueSection: {
    marginBottom: 16,
  },
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  venueTitle: {
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  venueMeta: {
    color: colors.textDim,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },

  // Event cards (full width)
  eventCard: {
    backgroundColor: 'rgba(28, 10, 62, 0.82)',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.35)' },
    }),
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 160,
  },
  imagePlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: colors.card,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  eventInfo: {
    padding: 12,
  },
  eventTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
  },
  bottomAccent: {
    height: 2,
  },

  // Horizontal small cards
  smallCard: {
    width: 180,
    marginRight: 12,
    backgroundColor: 'rgba(28, 10, 62, 0.82)',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      web: { boxShadow: '0 3px 14px rgba(0,0,0,0.3)' },
    }),
  },
  smallImageContainer: {
    position: 'relative',
  },
  smallImage: {
    width: '100%',
    height: 100,
  },
  smallBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  smallCardContent: {
    padding: 10,
  },
  smallTitle: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 4,
  },
  smallMeta: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
  },
  smallAccent: {
    height: 2,
  },

  verMasButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(155, 93, 229, 0.1)',
  },
  verMasText: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    marginTop: 8,
    padding: 20,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
});
