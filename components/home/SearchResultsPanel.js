import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, Platform,
} from 'react-native';
import { ChevronRight, MapPin, Calendar } from 'lucide-react-native';
import GlassOverlay from './GlassOverlay';
import colors from '../../theme/colors';
import { getCategoryBorderColor } from '../../utils/pinColors';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

const MAX_VENUES = 3;
const MAX_EVENTS = 10;

const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  const d = dayjs(dateStr);
  return d.isValid() ? d.format('D MMM') : '';
};

function SectionDivider({ label }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function VenueRow({ venue, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(venue)} activeOpacity={0.75}>
      {/* Avatar */}
      {venue.profileImage ? (
        <Image source={{ uri: venue.profileImage }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <MapPin size={14} color={colors.primary} />
        </View>
      )}

      {/* Info */}
      <View style={styles.rowContent}>
        <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {[venue.type, venue.city].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <ChevronRight size={16} color={colors.primary} />
    </TouchableOpacity>
  );
}

function EventRow({ event, onPressMap, onPressDetail }) {
  const accentColor = getCategoryBorderColor(event.category || '') || colors.primary;
  const dateStr = formatDateShort(event.date);
  const venuePart = event.venueName || event.location || '';
  const sub = [dateStr, venuePart].filter(Boolean).join(' · ');

  return (
    <View style={styles.row}>
      {/* Thumbnail or color bar */}
      {event.image ? (
        <Image source={{ uri: event.image }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: accentColor + '30' }]}>
          <Calendar size={14} color={accentColor} />
        </View>
      )}

      <TouchableOpacity style={styles.rowContent} onPress={() => onPressMap(event)}>
        <Text style={styles.name} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onPressDetail(event)} style={styles.chevronBtn}>
        <ChevronRight size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

export default function SearchResultsPanel({
  searchEvents,
  searchVenues,
  onFocusEvent,
  onGoToEventDetail,
  onFocusVenue,
  onGoToVenue,
  query,
  onViewAll,
  style,
}) {
  const venues = useMemo(() => (searchVenues || []).slice(0, MAX_VENUES), [searchVenues]);
  const events = useMemo(() => (searchEvents || []).slice(0, MAX_EVENTS), [searchEvents]);

  const hasVenues = venues.length > 0;
  const hasEvents = events.length > 0;

  if (!hasVenues && !hasEvents) return null;

  return (
    <GlassOverlay style={[styles.container, style]} borderRadius={16}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── VENUES ─── */}
        {hasVenues && (
          <>
            <SectionDivider label="Lugares" />
            {venues.map((v) => (
              <VenueRow
                key={`v-${v.id}`}
                venue={v}
                onPress={onGoToVenue}
              />
            ))}
          </>
        )}

        {/* ─── EVENTS ─── */}
        {hasEvents && (
          <>
            <SectionDivider label="Eventos" />
            {events.map((e, i) => (
              <EventRow
                key={`e-${e.id ?? i}`}
                event={e}
                onPressMap={onFocusEvent}
                onPressDetail={onGoToEventDetail}
              />
            ))}
          </>
        )}

        {/* ─── VER TODOS ─── */}
        {(hasVenues || hasEvents) && onViewAll && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={onViewAll} activeOpacity={0.75}>
            <Text style={styles.viewAllText}>
              {query ? `Ver todos los resultados para "${query}"` : 'Ver todos los resultados'}
            </Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </GlassOverlay>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    maxHeight: 400,
  },

  // ─── Section divider ───
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    marginHorizontal: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glassBorder,
  },
  dividerLabel: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    marginHorizontal: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ─── Row ───
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    gap: 10,
  },

  // ─── Venue avatar ───
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    flexShrink: 0,
  },
  avatarFallback: {
    backgroundColor: 'rgba(155, 93, 229, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },

  // ─── Event thumbnail ───
  thumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    flexShrink: 0,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },

  // ─── Row content ───
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  sub: {
    color: colors.textDim,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  chevronBtn: {
    padding: 2,
    flexShrink: 0,
  },

  // ─── Ver todos ───
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 2,
    gap: 4,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    flexShrink: 1,
  },
});
