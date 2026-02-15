import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Platform, Keyboard,
} from 'react-native';
import WebMap from '../components/WebMap';
import { MapView as NativeMapView, Marker as NativeMarker, Circle as NativeCircle, Polygon as NativePolygon } from '../components/NativeMap';
import BarrioDetailPanel from '../components/BarrioDetailPanel';
import { normalizeLatLng } from '../utils/geo';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useVenues, useEvents, useNeighborhoods } from '../hooks/useMapData';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/es';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Extracted hooks
import useHomeFilters from '../hooks/useHomeFilters';
import useMapInteractions from '../hooks/useMapInteractions';

// Extracted utils
import {
  getEventPinColor, getVenuePinColor,
  PIN_PURPLE, PIN_NAVY, PIN_NAVY_SELECTED,
} from '../utils/pinColors';
import {
  DEFAULT_MAP_REGION, DEFAULT_NATIVE_REGION, CITY_ZOOM_DELTA,
  getCarouselZoomDelta, getPinZoomOutDelta,
} from '../utils/mapHelpers';

// UI Components
import MapSearchBar from '../components/home/MapSearchBar';
import DateSelector from '../components/home/DateSelector';
import FilterPills from '../components/home/FilterPills';
import FilterPanel from '../components/home/FilterPanel';
import SearchResultsPanel from '../components/home/SearchResultsPanel';
import BottomCarousel from '../components/home/BottomCarousel';
import VenueCarousel from '../components/home/VenueCarousel';
import DayPickerModal from '../components/home/DayPickerModal';

dayjs.extend(isoWeek);
dayjs.locale('es');

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // API data
  const { data: venues = [], isLoading: venuesLoading } = useVenues();
  const { data: eventsData = [], isLoading: eventsLoading } = useEvents(venues);
  const { data: barrios = [], isLoading: barriosLoading } = useNeighborhoods();
  const isDataLoading = venuesLoading || eventsLoading || barriosLoading;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVenues, setSearchVenues] = useState([]);
  const [searchEvents, setSearchEvents] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showBarrios, setShowBarrios] = useState(false);
  const [selectedBarrio, setSelectedBarrio] = useState(null);

  // Location
  const [location, setLocation] = useState(null);
  const pulse = useRef(new Animated.Value(0)).current;

  // Filters hook
  const filterState = useHomeFilters(eventsData, searchQuery);

  // Map interactions hook
  const mapState = useMapInteractions({
    filteredEvents: filterState.filteredEvents,
    eventsData,
    navigation,
    selectedDateTag: filterState.selectedDateTag,
    selectedCategory: filterState.selectedCategory,
    selectedType: filterState.selectedType,
    selectedDay: filterState.selectedDay,
    selectedDays: filterState.selectedDays,
  });

  // ===== Location effects =====
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
    })();
  }, []);

  useEffect(() => {
    if (!location) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, [location]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !location?.coords || !mapState.mapRef.current) return;
    mapState.mapRegionRef.current = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: CITY_ZOOM_DELTA,
      longitudeDelta: CITY_ZOOM_DELTA,
    };
    mapState.animateMapToLatLng(location.coords, { zoomDeltaOverride: CITY_ZOOM_DELTA, applyOffset: false });
  }, [location]);

  // ===== Search effects =====
  useEffect(() => {
    if (searchQuery.trim() === '') {
      mapState.setSelectedEventPin(null);
    }
  }, [searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q === '') { setSearchVenues([]); setSearchEvents([]); return; }
    const today = dayjs().startOf('day');
    setSearchVenues(venues.filter((v) =>
      v.name?.toLowerCase().includes(q) || v.type?.toLowerCase().includes(q) || v.city?.toLowerCase().includes(q)
    ));
    setSearchEvents(eventsData.filter((e) => {
      const isFuture = e.date && (dayjs(e.date).isSame(today, 'day') || dayjs(e.date).isAfter(today));
      if (!isFuture) return false;
      return [e.title, e.description, e.location, e.category, e.type, e.dateTag]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    }));
  }, [searchQuery, venues, eventsData]);

  // ===== Handlers =====
  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    if (text.trim() === '') mapState.setSelectedEventPin(null);
  }, []);

  const handleBarrioPress = useCallback((barrio) => {
    setSelectedBarrio(barrio);
    mapState.setShowPanel(false);
    mapState.setShowVenuePanel(false);
    mapState.setSelectedIndex(null);
    mapState.setSelectedEventPin(null);
    mapState.setSelectedVenue(null);
  }, []);

  const handleToggleFilters = useCallback(() => setShowFilters(prev => !prev), []);
  const handleToggleBarrios = useCallback(() => setShowBarrios(prev => !prev), []);

  const handleToggleFilter = useCallback((filter) => {
    const result = filterState.toggleFilter(filter);
    if (result?.clearPins) { mapState.clearPins(); mapState.setShowVenuePanel(false); }
  }, [filterState.toggleFilter]);

  const handleRemoveFilter = useCallback((filterItem) => {
    if (filterItem.type === 'price') {
      filterState.setMaxPrice(300000);
    } else {
      const result = filterState.removeFilter(filterItem.value);
      if (result?.clearPins) { mapState.clearPins(); mapState.setShowVenuePanel(false); }
    }
  }, [filterState.removeFilter]);

  const handleFocusVenue = useCallback((v) => {
    mapState.focusVenueOnMap(v);
    setSearchQuery('');
    setShowFilters(false);
  }, [mapState.focusVenueOnMap]);

  const handleGoToVenue = useCallback((v) => {
    mapState.clearPins();
    mapState.setShowVenuePanel(false);
    navigation.navigate('VenueScreen', {
      venueName: v.name, venueType: v.type, venueCity: v.city,
      coverImage: v.coverImage, profileImage: v.profileImage, menuPdfUrl: v.menuPdfUrl,
    });
  }, [navigation]);

  const handleCardPress = useCallback((item, index) => {
    if (typeof index === 'number') mapState.setSelectedIndex(index);
    mapState.centerMapOnEvent(item, { force: true, zoomDeltaOverride: getCarouselZoomDelta() });
    mapState.clearPins();
    mapState.setShowVenuePanel(false);
    navigation.navigate('EventDetail', { event: item });
  }, [navigation, mapState.centerMapOnEvent]);

  const handleApplyDays = useCallback(() => {
    const result = filterState.handleApplyDays();
    if (result?.resetIndex) mapState.setSelectedIndex(null);
  }, [filterState.handleApplyDays]);

  // ===== Carousel scroll handlers =====
  const handleScrollBeginDrag = useCallback(() => {
    mapState.setIsCarouselScrolling(true);
    if (Platform.OS === 'web' && mapState.mapRef.current?.setOptions) {
      mapState.mapRef.current.setOptions({ gestureHandling: 'none' });
    }
  }, []);

  const handleScrollEndDrag = useCallback((e) => {
    mapState.setIsCarouselScrolling(false);
    const index = Math.round(e.nativeEvent.contentOffset.x / 270);
    if (index >= 0 && index < filterState.filteredEvents.length) mapState.setSelectedIndex(index);
    if (Platform.OS === 'web' && mapState.mapRef.current?.setOptions) {
      mapState.mapRef.current.setOptions({ gestureHandling: 'greedy' });
    }
  }, [filterState.filteredEvents.length]);

  const handleCarouselScroll = useCallback((e) => {
    if (Platform.OS !== 'web') return;
    const index = Math.round(e.nativeEvent.contentOffset.x / 270);
    if (index !== mapState.selectedIndex && index >= 0 && index < filterState.filteredEvents.length) {
      mapState.setSelectedIndex(index);
    }
  }, [mapState.selectedIndex, filterState.filteredEvents.length]);

  const handleMomentumScrollEnd = useCallback((e) => {
    mapState.setIsCarouselScrolling(false);
    const index = Math.round(e.nativeEvent.contentOffset.x / 270);
    if (index >= 0 && index < filterState.filteredEvents.length) mapState.setSelectedIndex(index);
    if (Platform.OS === 'web' && mapState.mapRef.current?.setOptions) {
      mapState.mapRef.current.setOptions({ gestureHandling: 'greedy' });
    }
  }, [filterState.filteredEvents.length]);

  const handleVenueMomentumEnd = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / 270);
    mapState.setVenueIndex(idx);
    const ev = mapState.venueEvents[idx];
    if (ev) mapState.centerMapOnEvent(ev, { force: true, streetZoom: true, zoomDeltaOverride: getPinZoomOutDelta() });
  }, [mapState.venueEvents]);

  // ===== Computed =====
  const eventMarkers = useMemo(() => {
    if (mapState.showVenuePanel) return [];
    return (filterState.filteredEvents || [])
      .map((ev, idx) => {
        const latlng = mapState.getEventLatLng(ev);
        if (!latlng) return null;
        return {
          id: ev.id, title: ev.title,
          latitude: latlng.latitude, longitude: latlng.longitude,
          pinColor: mapState.selectedIndex === idx ? '#FFFFFF' : getEventPinColor(ev),
        };
      })
      .filter(Boolean);
  }, [filterState.filteredEvents, mapState.selectedIndex, mapState.showVenuePanel]);

  const initialRegion = Platform.OS === 'web'
    ? {
        latitude: location?.coords?.latitude ?? DEFAULT_MAP_REGION.latitude,
        longitude: location?.coords?.longitude ?? DEFAULT_MAP_REGION.longitude,
        latitudeDelta: CITY_ZOOM_DELTA, longitudeDelta: CITY_ZOOM_DELTA,
      }
    : {
        latitude: location?.coords?.latitude ?? DEFAULT_NATIVE_REGION.latitude,
        longitude: location?.coords?.longitude ?? DEFAULT_NATIVE_REGION.longitude,
        ...DEFAULT_NATIVE_REGION,
      };

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 2.2] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });
  const resultsTop = showFilters ? 240 : 170;
  const apiKey = "AIzaSyBJymkbeUvctbb43PnnTUZ9GQNo6IeEwd0";

  if (isDataLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#BFA0FF', fontSize: 16, fontFamily: 'Outfit_500Medium' }}>Cargando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ===== MAP ===== */}
      {Platform.OS === 'web' ? (
        <WebMap
          ref={mapState.mapRef}
          apiKey={apiKey}
          style={[styles.map, Platform.OS === 'web' && { minHeight: '100vh', height: '100%' }]}
          initialRegion={initialRegion}
          onPress={mapState.handleMapPress}
          userLocation={location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : null}
          circleRadius={location ? Math.max(location.coords.accuracy || 50, 30) : null}
          eventMarkers={eventMarkers}
          onEventMarkerPress={(id) => {
            const evIdx = filterState.filteredEvents.findIndex((e) => e.id === id);
            if (evIdx !== -1) { mapState.handleMarkerPress(filterState.filteredEvents[evIdx]); mapState.setShowPanel(true); }
          }}
          selectedEventPin={!mapState.showVenuePanel && mapState.selectedEventPin ? {
            latitude: mapState.selectedEventPin.latitude, longitude: mapState.selectedEventPin.longitude,
            pinColor: getEventPinColor({ category: mapState.selectedEventPin.category }),
          } : null}
          selectedVenuePin={mapState.selectedVenue ? {
            latitude: mapState.selectedVenue.latitude, longitude: mapState.selectedVenue.longitude,
            pinColor: getVenuePinColor(mapState.selectedVenueMeta?.type),
          } : null}
          pinColors={{ default: PIN_PURPLE, selected: '#FFFFFF', venue: PIN_NAVY, venueSelected: PIN_NAVY_SELECTED }}
          barrios={showBarrios ? barrios : []}
          onBarrioPress={handleBarrioPress}
          onRegionChange={(region) => {
            if (!region) return;
            mapState.mapRegionRef.current = { ...mapState.mapRegionRef.current, ...region };
          }}
        />
      ) : (
        <NativeMapView
          ref={mapState.mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          scrollEnabled={!mapState.isCarouselScrolling}
          zoomEnabled={!mapState.isCarouselScrolling}
          rotateEnabled={!mapState.isCarouselScrolling}
          pitchEnabled={!mapState.isCarouselScrolling}
          onPress={mapState.handleMapPress}
          onRegionChangeComplete={(region) => {
            if (!region) return;
            mapState.mapRegionRef.current = { ...mapState.mapRegionRef.current, ...region };
          }}
        >
          {showBarrios && barrios.map((barrio) => (
            <NativePolygon
              key={barrio.id}
              coordinates={barrio.coordinates}
              fillColor={barrio.fillColor || 'rgba(159, 123, 255, 0.2)'}
              strokeColor={barrio.strokeColor || 'rgba(159, 123, 255, 0.6)'}
              strokeWidth={2} zIndex={1}
              onPress={() => handleBarrioPress(barrio)} tappable={true}
            />
          ))}

          {location && (
            <>
              <NativeCircle
                center={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
                radius={Math.max(location.coords.accuracy || 50, 30)}
                strokeColor="rgba(24,119,242,0.25)" fillColor="rgba(24,119,242,0.15)"
              />
              <NativeMarker
                coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
                anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}
              >
                <View style={styles.findMyDotWrapper}>
                  <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
                  <View style={styles.findMyDotOuter}>
                    <View style={styles.findMyDotInner} />
                  </View>
                </View>
              </NativeMarker>
            </>
          )}

          {!mapState.showVenuePanel && filterState.filteredEvents.map((event, index) => {
            const latlng = mapState.getEventLatLng(event);
            if (!latlng) return null;
            return (
              <NativeMarker
                key={event.id} coordinate={latlng}
                pinColor={mapState.selectedIndex === index ? '#FFFFFF' : getEventPinColor(event)}
                onPress={(e) => { e.stopPropagation(); mapState.handleMarkerPress(event); mapState.setShowPanel(true); }}
                zIndex={10}
              />
            );
          })}

          {!mapState.showVenuePanel && mapState.selectedEventPin && (
            <NativeMarker
              coordinate={{ latitude: mapState.selectedEventPin.latitude, longitude: mapState.selectedEventPin.longitude }}
              title={mapState.selectedEventPin.title}
              pinColor={getEventPinColor({ category: mapState.selectedEventPin.category })} zIndex={998}
            />
          )}

          {mapState.selectedVenue && (
            <NativeMarker
              coordinate={{ latitude: mapState.selectedVenue.latitude, longitude: mapState.selectedVenue.longitude }}
              title={mapState.selectedVenue.name}
              pinColor={getVenuePinColor(mapState.selectedVenueMeta?.type)} zIndex={999}
            />
          )}
        </NativeMapView>
      )}

      {/* ===== SEARCH BAR ===== */}
      <MapSearchBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onClear={() => { setSearchQuery(''); mapState.setSelectedEventPin(null); }}
        showFilters={showFilters}
        onToggleFilters={handleToggleFilters}
        showBarrios={showBarrios}
        onToggleBarrios={handleToggleBarrios}
        style={{ position: 'absolute', top: insets.top + 8, left: 15, right: 15, zIndex: 12 }}
      />

      {/* ===== FILTER ROW (Date + Pills) ===== */}
      <View style={[styles.filterRow, { top: insets.top + 56 }]}>
        {filterState.hasCategoryOrTypeFilters ? (
          <>
            <DateSelector
              currentDate={filterState.currentDate}
              onPrev={() => filterState.setCurrentDate((p) => p.subtract(1, 'day'))}
              onNext={() => filterState.setCurrentDate((p) => p.add(1, 'day'))}
              onPress={filterState.openDayPicker}
              activeDateFilterDisplay={filterState.activeDateFilterDisplay}
              selectedDays={filterState.selectedDays}
            />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <FilterPills filters={filterState.allActiveFilters} onRemove={handleRemoveFilter} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.filtersLeft}>
              <FilterPills filters={filterState.allActiveFilters} onRemove={handleRemoveFilter} />
            </View>
            <DateSelector
              currentDate={filterState.currentDate}
              onPrev={() => filterState.setCurrentDate((p) => p.subtract(1, 'day'))}
              onNext={() => filterState.setCurrentDate((p) => p.add(1, 'day'))}
              onPress={filterState.openDayPicker}
              activeDateFilterDisplay={filterState.activeDateFilterDisplay}
              selectedDays={filterState.selectedDays}
            />
            <View style={styles.filtersRight} />
          </>
        )}
      </View>

      {/* ===== FILTER PANEL ===== */}
      {showFilters && (
        <FilterPanel
          filters={filterState.filters}
          selectedDateTag={filterState.selectedDateTag}
          selectedCategories={filterState.selectedCategories}
          selectedTypes={filterState.selectedTypes}
          hasSelectedCategory={filterState.hasSelectedCategory}
          availableTypes={filterState.availableTypes}
          maxPrice={filterState.maxPrice}
          showPricePanel={filterState.showPricePanel}
          onToggleFilter={handleToggleFilter}
          onSetMaxPrice={filterState.setMaxPrice}
          onTogglePricePanel={() => filterState.setShowPricePanel(prev => !prev)}
          style={{ position: 'absolute', top: insets.top + 96, left: 15, right: 15, zIndex: 11 }}
        />
      )}

      {/* ===== SEARCH RESULTS ===== */}
      {searchQuery.length > 0 && (searchVenues.length > 0 || searchEvents.length > 0) && (
        <SearchResultsPanel
          searchEvents={searchEvents}
          searchVenues={searchVenues}
          onFocusEvent={mapState.focusEventOnMap}
          onGoToEventDetail={mapState.goToEventDetailClearingPins}
          onFocusVenue={handleFocusVenue}
          onGoToVenue={handleGoToVenue}
          style={{ position: 'absolute', top: resultsTop, left: 15, right: 15, zIndex: 13 }}
        />
      )}

      {/* ===== BOTTOM CAROUSEL ===== */}
      {!mapState.showVenuePanel && (
        <BottomCarousel
          filteredEvents={filterState.filteredEvents}
          selectedIndex={mapState.selectedIndex}
          activeFilters={filterState.activeFilters}
          flatListRef={mapState.flatListRef}
          pan={mapState.pan}
          panResponder={mapState.panResponder}
          onCardPress={handleCardPress}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onScroll={handleCarouselScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
        />
      )}

      {/* ===== VENUE CAROUSEL ===== */}
      {mapState.showVenuePanel && mapState.selectedVenue && (
        <VenueCarousel
          venueEvents={mapState.venueEvents}
          venueIndex={mapState.venueIndex}
          selectedVenueMeta={mapState.selectedVenueMeta}
          selectedVenue={mapState.selectedVenue}
          pan={mapState.pan}
          panResponder={mapState.panResponder}
          onCardPress={handleCardPress}
          onMomentumScrollEnd={handleVenueMomentumEnd}
        />
      )}

      {/* ===== DAY PICKER MODAL ===== */}
      <DayPickerModal
        visible={filterState.showDayPicker}
        tempSelectedDays={filterState.tempSelectedDays}
        currentDate={filterState.currentDate}
        onClose={filterState.closeDayPicker}
        onDayToggle={filterState.handleDayToggle}
        onClear={filterState.handleClearDays}
        onApply={handleApplyDays}
      />

      {/* ===== BARRIO DETAIL PANEL ===== */}
      <BarrioDetailPanel
        barrio={selectedBarrio}
        visible={!!selectedBarrio}
        onClose={() => setSelectedBarrio(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  filterRow: {
    position: 'absolute',
    left: 15, right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 11,
  },
  filtersLeft: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingRight: 8,
  },
  filtersRight: {
    flex: 1,
    maxWidth: '45%',
  },
  // Find My dot styles (native only)
  findMyDotWrapper: {
    width: 26, height: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute', width: 26, height: 26,
    borderRadius: 13, backgroundColor: 'rgba(24,119,242,0.35)',
  },
  findMyDotOuter: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#1877F2', borderWidth: 2, borderColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  findMyDotInner: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF',
  },
});
