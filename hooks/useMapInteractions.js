import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, Animated, PanResponder, Keyboard } from 'react-native';
import { normalizeLatLng } from '../utils/geo';
import {
  DEFAULT_MAP_REGION, DEFAULT_NATIVE_REGION, CITY_ZOOM_DELTA,
  getStreetZoomDelta, getPinZoomOutDelta, getCarouselZoomDelta,
  STREET_ZOOM_RELAX_FACTOR, PIN_VERTICAL_OFFSET_FACTOR,
} from '../utils/mapHelpers';
import dayjs from 'dayjs';

export default function useMapInteractions({
  filteredEvents, eventsData, navigation,
  selectedDateTag, selectedCategory, selectedType, selectedDay, selectedDays,
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showPanel, setShowPanel] = useState(true);
  const [showVenuePanel, setShowVenuePanel] = useState(false);
  const [venueEvents, setVenueEvents] = useState([]);
  const [venueIndex, setVenueIndex] = useState(0);
  const [selectedVenueMeta, setSelectedVenueMeta] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [selectedEventPin, setSelectedEventPin] = useState(null);
  const [isCarouselScrolling, setIsCarouselScrolling] = useState(false);

  const mapRef = useRef(null);
  const flatListRef = useRef(null);
  const mapRegionRef = useRef(Platform.OS === 'web' ? { ...DEFAULT_MAP_REGION } : { ...DEFAULT_NATIVE_REGION });
  const streetZoomNextRef = useRef(false);
  const centerTimeoutRef = useRef(null);
  const lastCenteredEventId = useRef(null);
  const pan = useRef(new Animated.Value(0)).current;
  const prevSelectedDays = useRef(JSON.stringify(selectedDays));
  const prevSelectedDay = useRef(selectedDay);

  const clearPins = useCallback(() => {
    setSelectedVenue(null);
    setSelectedEventPin(null);
  }, []);

  const getVenueLatLng = (v) => normalizeLatLng(v?.coordinates ?? { latitude: v?.latitude, longitude: v?.longitude });
  const getEventLatLng = (e) => normalizeLatLng(e?.coordinates ?? { latitude: e?.latitude, longitude: e?.longitude });

  const animateMapToLatLng = useCallback((latlng, { streetZoom = false, zoomDeltaOverride = null, applyOffset = true } = {}) => {
    if (!mapRef.current || !latlng) return;

    const baseLatDelta = Platform.OS === 'web' ? DEFAULT_MAP_REGION.latitudeDelta : DEFAULT_NATIVE_REGION.latitudeDelta;
    const baseLonDelta = Platform.OS === 'web' ? DEFAULT_MAP_REGION.longitudeDelta : DEFAULT_NATIVE_REGION.longitudeDelta;
    const currentLatDelta = mapRegionRef.current?.latitudeDelta ?? baseLatDelta;
    const currentLonDelta = mapRegionRef.current?.longitudeDelta ?? baseLonDelta;

    const ratio = currentLatDelta > 0 ? currentLonDelta / currentLatDelta : 1;
    const streetZoomDelta = getStreetZoomDelta();

    let targetLatDelta = currentLatDelta;
    let targetLonDelta = currentLonDelta;

    if (zoomDeltaOverride != null) {
      targetLatDelta = zoomDeltaOverride;
      targetLonDelta = ratio * targetLatDelta;
    } else if (streetZoom && currentLatDelta > streetZoomDelta) {
      targetLatDelta = streetZoomDelta;
      targetLonDelta = ratio * targetLatDelta;
    } else if (streetZoom) {
      const relaxedLatDelta = Math.min(currentLatDelta * STREET_ZOOM_RELAX_FACTOR, DEFAULT_NATIVE_REGION.latitudeDelta);
      targetLatDelta = Math.max(relaxedLatDelta, streetZoomDelta);
      targetLonDelta = ratio * targetLatDelta;
    }

    const verticalOffset = applyOffset ? targetLatDelta * PIN_VERTICAL_OFFSET_FACTOR : 0;
    const adjustedLatitude = Math.max(-89.9, Math.min(89.9, latlng.latitude - verticalOffset));

    const targetRegion = {
      latitude: adjustedLatitude,
      longitude: latlng.longitude,
      latitudeDelta: targetLatDelta,
      longitudeDelta: targetLonDelta,
    };

    mapRef.current.animateToRegion(targetRegion, 350);
    mapRegionRef.current = { ...targetRegion };
  }, []);

  const centerMapOnEvent = useCallback((event, { force = false, streetZoom = false, zoomDeltaOverride = null } = {}) => {
    if (!event || !event.id) return;
    if (!force && lastCenteredEventId.current === event.id) return;
    const latlng = getEventLatLng(event);
    if (!latlng) return;
    lastCenteredEventId.current = event.id;
    animateMapToLatLng(latlng, { streetZoom, zoomDeltaOverride });
  }, [animateMapToLatLng]);

  const handleMarkerPress = useCallback((event) => {
    const index = filteredEvents.findIndex((e) => e.id === event.id);
    if (index !== -1) {
      clearPins();
      setShowVenuePanel(false);
      setSelectedIndex(index);
      setShowPanel(true);
      flatListRef.current?.scrollToIndex({ index, animated: true });
      centerMapOnEvent(filteredEvents[index], { force: true, zoomDeltaOverride: getPinZoomOutDelta() });
    }
  }, [filteredEvents, clearPins, centerMapOnEvent]);

  const getUpcomingEventsForVenue = useCallback((venueName) => {
    const today = dayjs().startOf('day');
    return eventsData
      .filter((e) => {
        const loc = (e.location || '').toLowerCase();
        const vname = (e.venueName || '').toLowerCase();
        const match = loc.includes((venueName || '').toLowerCase()) || vname === (venueName || '').toLowerCase();
        if (!match) return false;
        const d = e.date ? dayjs(e.date) : null;
        if (!d) return false;
        return d.isSame(today, 'day') || d.isAfter(today);
      })
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  }, [eventsData]);

  const getFilteredEventsForVenue = useCallback((venueName) => {
    const vnLower = (venueName || '').toLowerCase();
    return filteredEvents
      .filter((e) => (e.venueName || '').toLowerCase() === vnLower)
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  }, [filteredEvents]);

  const handleVenueMarkerPress = useCallback((venueName, venueType, latlng) => {
    const list = getFilteredEventsForVenue(venueName);
    setSelectedVenue({ id: venueName, name: venueName, ...latlng });
    setSelectedVenueMeta({ name: venueName, type: venueType });
    setVenueEvents(list);
    setVenueIndex(0);
    setShowVenuePanel(true);
    setShowPanel(false);
    setSelectedEventPin(null);
  }, [getFilteredEventsForVenue]);

  const focusVenueOnMap = useCallback((v) => {
    const latlng = getVenueLatLng(v);
    if (!latlng) return;
    const list = getUpcomingEventsForVenue(v.name);
    setSelectedVenue({ id: v.id, name: v.name, ...latlng });
    setSelectedVenueMeta({ name: v.name, type: v.type });
    setVenueEvents(list);
    setVenueIndex(0);
    setShowVenuePanel(true);
    setShowPanel(false);
    setSelectedEventPin(null);
  }, [getUpcomingEventsForVenue]);

  const focusEventOnMap = useCallback((e) => {
    const latlng = getEventLatLng(e);
    if (!latlng || !mapRef.current) return;
    setSelectedEventPin({ title: e.title, category: e.category, venueName: e.venueName || null, ...latlng });
    setSelectedVenue(null);
    setVenueEvents([e]);
    setSelectedVenueMeta({ name: e.venueName || e.location || e.title });
    setVenueIndex(0);
    centerMapOnEvent(e, { force: true, zoomDeltaOverride: getCarouselZoomDelta() });
    setShowPanel(false);
    setShowVenuePanel(true);
  }, [centerMapOnEvent]);

  const goToEventDetailClearingPins = useCallback((event) => {
    clearPins();
    setShowVenuePanel(false);
    navigation.navigate('EventDetail', { event });
  }, [clearPins, navigation]);

  const handleMapPress = useCallback(() => {
    setShowPanel(false);
    setSelectedIndex(null);
    setShowVenuePanel(false);
    clearPins();
  }, [clearPins]);

  // PanResponder for swipe-up
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) pan.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -150) {
          clearPins();
          setShowVenuePanel(false);
          navigation.navigate('Events', {
            filters: {
              dateTag: selectedDateTag,
              category: selectedCategory,
              type: selectedType,
              specificDay: selectedDateTag === 'ALL' ? selectedDay : null,
            },
          });
        }
        Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Animate map when venue is selected
  useEffect(() => {
    if (selectedVenue && selectedVenue.latitude && selectedVenue.longitude && mapRef.current) {
      const latlng = { latitude: selectedVenue.latitude, longitude: selectedVenue.longitude };
      Keyboard.dismiss();
      requestAnimationFrame(() => {
        if (mapRef.current) animateMapToLatLng(latlng, { streetZoom: true });
      });
    }
  }, [selectedVenue, animateMapToLatLng]);

  // Sync filtered events -> selectedIndex
  useEffect(() => {
    const selectedDaysChanged = prevSelectedDays.current !== JSON.stringify(selectedDays);
    const dayChanged = prevSelectedDay.current !== selectedDay;
    prevSelectedDays.current = JSON.stringify(selectedDays);
    prevSelectedDay.current = selectedDay;

    if (Platform.OS === 'web') {
      if (!filteredEvents || filteredEvents.length === 0) {
        setSelectedIndex(null);
        if (!showVenuePanel) clearPins();
        return;
      }
      setShowPanel(true);
      const shouldReset = selectedDaysChanged || selectedIndex == null || selectedIndex >= filteredEvents.length || (filteredEvents.length > 0 && selectedIndex < 0);
      if (shouldReset) {
        if (selectedDaysChanged || (dayChanged && selectedDays.length === 0)) {
          setSelectedIndex(null);
          return;
        }
        // When filter changes produce multiple events, don't auto-zoom to the first one
        if (filteredEvents.length > 1) {
          setSelectedIndex(null);
        } else {
          setSelectedIndex(0);
        }
        setTimeout(() => {
          if (flatListRef.current && filteredEvents.length > 0) {
            try { flatListRef.current.scrollToIndex({ index: 0, animated: false }); }
            catch { try { flatListRef.current.scrollToOffset({ offset: 0, animated: false }); } catch {} }
          }
        }, 100);
      }
      return;
    }

    if (!filteredEvents || filteredEvents.length === 0) {
      setSelectedIndex(null);
      if (!showVenuePanel) clearPins();
      return;
    }
    setShowPanel(true);
    const shouldReset = selectedDaysChanged || selectedIndex == null || selectedIndex >= filteredEvents.length || (filteredEvents.length > 0 && selectedIndex < 0);
    if (shouldReset) {
      // When filter changes produce multiple events, don't auto-zoom to the first one
      if (filteredEvents.length > 1) {
        setSelectedIndex(null);
      } else {
        setSelectedIndex(0);
        streetZoomNextRef.current = true;
      }
      setTimeout(() => {
        if (flatListRef.current && filteredEvents.length > 0) {
          try { flatListRef.current.scrollToIndex({ index: 0, animated: false }); }
          catch { try { flatListRef.current.scrollToOffset({ offset: 0, animated: false }); } catch {} }
        }
      }, 100);
    }
  }, [filteredEvents, selectedDays, selectedDay]);

  // Center map on selected event (skip when venue panel is open)
  useEffect(() => {
    if (centerTimeoutRef.current) {
      clearTimeout(centerTimeoutRef.current);
      centerTimeoutRef.current = null;
    }
    if (showVenuePanel) return;
    if (selectedIndex == null || selectedIndex < 0 || selectedIndex >= filteredEvents.length) return;
    const eventToCenter = filteredEvents[selectedIndex];
    if (!eventToCenter) return;

    centerTimeoutRef.current = setTimeout(() => {
      if (Platform.OS === 'web') {
        centerMapOnEvent(eventToCenter, { force: true, zoomDeltaOverride: getCarouselZoomDelta() });
      } else {
        const shouldStreetZoom = streetZoomNextRef.current;
        streetZoomNextRef.current = false;
        if (shouldStreetZoom) {
          centerMapOnEvent(eventToCenter, { force: true, streetZoom: true });
        } else {
          centerMapOnEvent(eventToCenter, { force: true, zoomDeltaOverride: getCarouselZoomDelta() });
        }
      }
    }, 60);

    return () => {
      if (centerTimeoutRef.current) { clearTimeout(centerTimeoutRef.current); centerTimeoutRef.current = null; }
    };
  }, [selectedIndex, filteredEvents, centerMapOnEvent, showVenuePanel]);

  return {
    selectedIndex, setSelectedIndex,
    showPanel, setShowPanel,
    showVenuePanel, setShowVenuePanel,
    venueEvents, venueIndex, setVenueIndex,
    selectedVenueMeta,
    selectedVenue, setSelectedVenue,
    selectedEventPin, setSelectedEventPin,
    isCarouselScrolling, setIsCarouselScrolling,
    mapRef, flatListRef, mapRegionRef, streetZoomNextRef,
    pan, panResponder,
    clearPins,
    getVenueLatLng, getEventLatLng,
    animateMapToLatLng,
    centerMapOnEvent,
    handleMarkerPress,
    getFilteredEventsForVenue,
    handleVenueMarkerPress,
    focusVenueOnMap,
    focusEventOnMap,
    goToEventDetailClearingPins,
    handleMapPress,
  };
}
