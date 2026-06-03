import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, ScrollView, Platform, StyleSheet, TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import { CalendarX2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventCard from './EventCard';
import CinemaShowtimeSheet from '../CinemaShowtimeSheet';
import colors from '../../theme/colors';
import { TAB_BAR_HEIGHT } from '../FloatingTabBar';
import { categoryColors, getCategoryBorderColor } from '../../utils/pinColors';
import useDragScroll from '../../hooks/useDragScroll';
import { groupCinemaEvents } from '../../utils/cinemaGrouping';

const SPRING_CONFIG = { damping: 18, stiffness: 140, mass: 0.9 };

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function BottomCarousel({
  filteredEvents,
  groupedEvents: groupedEventsProp,
  selectedIndex,
  activeFilters,
  flatListRef,
  pan,          // kept for interface compat — unused
  panResponder, // kept for interface compat — unused
  onCardPress,
  onScrollBeginDrag,
  onScrollEndDrag,
  onScroll,
  onMomentumScrollEnd,
  // Venue panel
  showVenuePanel,
  venueEvents,
  selectedVenueMeta,
  onCloseVenuePanel,
  onClose,
}) {
  const dragRef = useDragScroll(flatListRef);
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12) + TAB_BAR_HEIGHT + 14;

  // Cinema showtime sheet state
  const [cinemaSheetGroup, setCinemaSheetGroup] = useState(null);

  // Use pre-computed groupedEvents from parent when available (keeps carousel indices in sync with scroll handlers)
  const computedGroupedEvents = useMemo(() => groupCinemaEvents(filteredEvents), [filteredEvents]);
  const groupedEvents = groupedEventsProp ?? computedGroupedEvents;

  // ─── Entrance animation ───
  const entrance = useSharedValue(0);

  useEffect(() => {
    entrance.value = 0;
    entrance.value = withSpring(1, { ...SPRING_CONFIG, stiffness: 120 });
  }, [filteredEvents.length > 0]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entrance.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(entrance.value, [0, 1], [60, 0], Extrapolation.CLAMP) },
    ],
  }));

  // ─── Filter chips (compact) ───
  const carouselFilters = activeFilters.filter(filter => {
    if (filter.includes(' · ')) return true;
    return !categoryColors.hasOwnProperty(filter);
  });

  const hasEvents = groupedEvents.length > 0;

  return (
    <>
    <Animated.View style={[styles.wrapper, { bottom: bottomOffset }, entranceStyle]}>
      {/* ─── Floating pill: filter chips + count ─── */}
      {(carouselFilters.length > 0 || hasEvents) && (
        <View style={styles.pillRow}>
          {hasEvents && (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{groupedEvents.length} eventos</Text>
            </View>
          )}
          {carouselFilters.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
            >
              {carouselFilters.map((filter, index) => {
                const borderColor = getCategoryBorderColor(filter);
                return (
                  <View
                    key={filter}
                    style={[
                      styles.chip,
                      index > 0 && { marginLeft: 6 },
                      borderColor && { borderWidth: 1.5, borderColor },
                    ]}
                  >
                    <Text style={styles.chipText}>{filter}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closePillBtn} activeOpacity={0.7}>
              <X size={15} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ─── Cards or empty state ─── */}
      {showVenuePanel ? (
        <>
          {/* Venue header */}
          <View style={styles.venueHeader}>
            <View style={styles.countPill}>
              <Text style={styles.countText} numberOfLines={1}>
                En {selectedVenueMeta?.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onCloseVenuePanel} style={styles.venueCloseBtn} activeOpacity={0.7}>
              <X size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {venueEvents && venueEvents.length > 0 ? (
            <FlatList
              horizontal
              data={groupCinemaEvents(venueEvents)}
              renderItem={({ item, index }) => (
                <EventCard
                  item={item}
                  index={index}
                  isSelected={false}
                  onPress={(ev) => onCardPress(ev, null)}
                  onVerHorarios={item._isCinemaGroup ? setCinemaSheetGroup : undefined}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              snapToInterval={240}
              snapToAlignment="start"
              decelerationRate={Platform.OS === 'web' ? 0.985 : 'fast'}
              scrollEventThrottle={16}
              getItemLayout={(data, index) => ({
                length: 240,
                offset: 240 * index,
                index,
              })}
            />
          ) : (
            <View style={styles.emptyPill}>
              <CalendarX2 size={22} color={colors.primaryDark} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.emptyTitle}>No hay eventos próximos en este venue</Text>
                <Text style={styles.emptySub}>Vuelve más tarde para ver novedades</Text>
              </View>
            </View>
          )}
        </>
      ) : hasEvents ? (
        <AnimatedFlatList
          ref={dragRef}
          horizontal
          data={groupedEvents}
          renderItem={({ item, index }) => (
            <EventCard
              item={item}
              index={index}
              isSelected={selectedIndex === index}
              onPress={onCardPress}
              onVerHorarios={item._isCinemaGroup ? setCinemaSheetGroup : undefined}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          snapToInterval={240}
          snapToAlignment="start"
          decelerationRate={Platform.OS === 'web' ? 0.985 : 'fast'}
          pagingEnabled={Platform.OS === 'web'}
          scrollEventThrottle={16}
          getItemLayout={(data, index) => ({
            length: 240,
            offset: 240 * index,
            index,
          })}
          initialScrollIndex={0}
          onScrollBeginDrag={onScrollBeginDrag}
          onScrollEndDrag={onScrollEndDrag}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumScrollEnd}
        />
      ) : (
        <View style={styles.emptyPill}>
          <CalendarX2 size={22} color={colors.primaryDark} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.emptyTitle}>No hay eventos para esta fecha</Text>
            <Text style={styles.emptySub}>Prueba cambiando la fecha o los filtros</Text>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeEmptyBtn} activeOpacity={0.7}>
              <X size={15} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>

    {/* Cinema showtime sheet — rendered outside the Animated.View to avoid clipping */}
    <CinemaShowtimeSheet
      group={cinemaSheetGroup}
      visible={!!cinemaSheetGroup}
      onClose={() => setCinemaSheetGroup(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },

  // ─── Pill row ───
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  chipsContainer: {
    alignItems: 'center',
    flexGrow: 1,
    paddingRight: 8,
  },
  chip: {
    backgroundColor: 'rgba(28, 10, 62, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  countPill: {
    backgroundColor: 'rgba(28, 10, 62, 0.85)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },

  // ─── Pill row close button ───
  closePillBtn: {
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: 5,
  },

  // ─── Empty pill close button ───
  closeEmptyBtn: {
    marginLeft: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: 5,
    alignSelf: 'center',
  },

  // ─── Venue header ───
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 8,
  },
  venueCloseBtn: {
    backgroundColor: colors.glassLight,
    borderRadius: 8,
    padding: 5,
  },

  // ─── Empty state ───
  emptyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(28, 10, 62, 0.82)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      web: { boxShadow: '0 6px 24px rgba(0,0,0,0.35)' },
    }),
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  emptySub: {
    color: colors.textDim,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
});
