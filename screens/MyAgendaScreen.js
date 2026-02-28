import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, MapPin } from 'lucide-react-native';
import colors from '../theme/colors';
import GlassOverlay from '../components/home/GlassOverlay';
import { categoryColors } from '../utils/pinColors';
import { normalizeCategory } from '../utils/filters.schema';
import { useSavedEvents } from '../hooks/useUserPreferences';

import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

const badgeColors = {
  'Música': colors.badgeMusica,
  'Teatro': colors.badgeTeatro,
  'Comedia': colors.badgeComedia,
  'Arte': colors.badgeArte,
  'Cine': colors.badgeCine,
};

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
  };
}

function formatEventDateTime(event) {
  const d = event?.date ? dayjs(event.date) : null;
  if (!d || !d.isValid()) return '';
  const datePart = d.format('D [de] MMMM');
  return event?.timeStart ? `${datePart}, ${event.timeStart}` : datePart;
}

export default function MyAgendaScreen({ navigation }) {
  const { data: rawEvents = [], isLoading } = useSavedEvents();
  const events = rawEvents.map(toFrontendEvent);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Agenda</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : events.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {events.map(renderEventCard)}
        </ScrollView>
      ) : (
        <View style={styles.centered}>
          <GlassOverlay borderRadius={12} style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No tienes eventos guardados</Text>
            <Text style={styles.emptySubtitle}>
              Guarda eventos que te interesen para verlos aquí.
            </Text>
          </GlassOverlay>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: colors.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  // Event cards — same as NotificationsScreen
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
  emptyState: {
    alignItems: 'center',
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
    textAlign: 'center',
  },
});
