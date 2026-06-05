import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  Modal,
  ScrollView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import TabScreenLayout from '../components/TabScreenLayout';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import WebMap from '../components/WebMap';
import { MapView as NativeMapView, Marker as NativeMarker } from '../components/NativeMap';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import { useEventDetail } from '../hooks/useEventDetail';
import { normalizeCategory } from '../utils/filters.schema.js';
import { formatPrice, getEventPriceLabel } from '../utils/mapHelpers';
import { getCinemaSchedule, formatScheduleDate } from '../utils/cinemaGrouping';
import { LinearGradient } from 'expo-linear-gradient';
import ReviewModal from '../components/ReviewModal';
import { useIsEventSaved, useToggleSaveEvent } from '../hooks/useUserPreferences';
import { GOOGLE_MAPS_API_KEY } from '../config/env';

// Colores de pines
const CINE_BLUE = '#3B52D8';
const CINE_LIGHT = 'rgba(59, 82, 216, 0.15)';
const CINE_BORDER = 'rgba(59, 82, 216, 0.3)';
const PIN_PURPLE = '#9F7BFF';
const PIN_TEATRO = '#3B82F6'; // vibrant bright blue para eventos de Teatro
const PIN_COMEDIA = '#FF69B4'; // vibrant pink para eventos de Comedia
const PIN_ARTE = '#00BCD4'; // vibrant cyan/turquoise para eventos de Arte
const PIN_CINE = '#3B52D8'; // deep blue para eventos de Cine
const IMAGE_HEIGHT = 280;

// Helper para obtener el color del pin basado en la categoría del evento
const getEventPinColor = (event) => {
  const category = normalizeCategory(event?.category);
  if (category === 'Teatro') {
    return PIN_TEATRO;
  }
  if (category === 'Comedia') {
    return PIN_COMEDIA;
  }
  if (category === 'Arte') {
    return PIN_ARTE;
  }
  if (category === 'Cine') {
    return PIN_CINE;
  }
  return PIN_PURPLE; // Default color para otras categorías
};

/** Map platform name → icon config for community links */
const PLATFORM_ICONS = {
  tiktok: { pack: 'mci', icon: 'music-note', label: 'TikTok' },
  instagram: { pack: 'ion', icon: 'logo-instagram', label: 'Instagram' },
  website: { pack: 'ion', icon: 'link-outline', label: 'Sitio Web' },
  twitter: { pack: 'ion', icon: 'logo-twitter', label: 'Twitter' },
  facebook: { pack: 'ion', icon: 'logo-facebook', label: 'Facebook' },
  youtube: { pack: 'ion', icon: 'logo-youtube', label: 'YouTube' },
  spotify: { pack: 'mci', icon: 'spotify', label: 'Spotify' },
};

function getPlatformConfig(platform) {
  const key = (platform || '').toLowerCase();
  return PLATFORM_ICONS[key] || { pack: 'ion', icon: 'link-outline', label: platform || 'Enlace' };
}


function Stars({ rating = 0 }) {
  const full = Math.floor(rating);
  const empty = 5 - full;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: full }).map((_, i) => (
        <Ionicons key={`f-${i}`} name="star" size={14} color="#FFD166" style={{ marginRight: 2 }} />
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <Ionicons key={`e-${i}`} name="star-outline" size={14} color="#FFD166" style={{ marginRight: 2 }} />
      ))}
      <Text style={{ color: '#BBB', marginLeft: 6, fontSize: 12 }}>{rating}/5</Text>
    </View>
  );
}

/* --------- FIX COORDENADAS --------- */
const toNum = (v) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
};

/** Normaliza a { latitude, longitude } aceptando:
 *  - { latitude, longitude } o { lat, lng } (número o string)
 *  - [lat, lon] o [lon, lat]  ➜ Detecta y corrige si viene [lon, lat]
 */
function normalizeLatLng(coords) {
  if (!coords) return null;

  // Objeto con latitude/longitude o lat/lng
  if (typeof coords === 'object' && !Array.isArray(coords)) {
    const lat = toNum(coords.latitude ?? coords.lat);
    const lon = toNum(coords.longitude ?? coords.lng);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { latitude: lat, longitude: lon };
    }
    return null;
  }

  // Array
  if (Array.isArray(coords) && coords.length >= 2) {
    const a = toNum(coords[0]);
    const b = toNum(coords[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

    const absA = Math.abs(a);
    const absB = Math.abs(b);

    // Heurística robusta:
    // - Si el primero parece LONG (>|60|) y el segundo LAT (<|60|) ⇒ [lon, lat] ➜ swap
    // - Si el primero parece LAT (<|60|) y el segundo LONG (>|60|) ⇒ [lat, lon]
    // - Si ambos < 60 (ambiguo), preferimos [lat, lon]
    // - Si ambos > 60 (raro), devolvemos null
    const looksLonLat = absA > 60 && absB < 60;
    const looksLatLon = absA < 60 && absB > 60;

    if (looksLonLat) return { latitude: b, longitude: a };
    if (looksLatLon) return { latitude: a, longitude: b };

    if (absA < 60 && absB < 60) {
      // cercano al ecuador/latitudes moderadas: asumir [lat, lon]
      return { latitude: a, longitude: b };
    }

    if (absA <= 90 && absB <= 180) return { latitude: a, longitude: b };
    if (absA <= 180 && absB <= 90) return { latitude: b, longitude: a };

    return null;
  }

  return null;
}

/* --------- FIN FIX COORDENADAS --------- */

/** Badge tipo producto */
function TypeBadge({ type }) {
  if (!type) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{type}</Text>
    </View>
  );
}

/** Tarjeta producto */
function ProductCard({ item }) {
  const onPress = () => {
    if (item?.url) Linking.openURL(item.url).catch(() => Alert.alert('Error', 'No se pudo abrir el enlace'));
  };
  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.9}>
      {item?.image ? (
        <Image source={{ uri: item.image }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, { backgroundColor: '#2B245C' }]} />
      )}
      <TypeBadge type={item?.type} />
      <Text style={styles.productTitle} numberOfLines={2}>{item?.title || 'Producto'}</Text>
      {item?.price != null && (
        <Text style={styles.productPrice}>
          {formatPrice(item.price)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/** Pill de enlace */
function LinkPill({ icon = 'link-outline', label, url, pack = 'ion' }) {
  if (!url) return null;
  const onPress = () => Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el enlace'));
  return (
    <TouchableOpacity style={styles.linkPill} onPress={onPress} activeOpacity={0.9}>
      {pack === 'mci' ? (
        <MaterialCommunityIcons name={icon} size={16} color="#22003D" />
      ) : (
        <Ionicons name={icon} size={16} color="#22003D" />
      )}
      <Text style={styles.linkPillText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function EventDetailScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { event: routeEvent } = route.params;
  const isCinemaGroup = !!routeEvent?._isCinemaGroup;
  // For cinema groups fetch the detail of the oldest upcoming showtime (lowest id)
  // to get community links (trailer). The TMDB enricher runs after each scrape batch
  // and may not yet have processed the most recent batch — older event records (lower
  // ids) are more reliably enriched. Sorting by id ascending before picking the first
  // upcoming showtime maximises the chance of landing on an enriched record.
  const detailFetchId = useMemo(() => {
    if (!isCinemaGroup) return routeEvent?.id ?? null;
    const showtimes = routeEvent?.showtimes || [];
    if (!showtimes.length) return routeEvent?.id ?? null;
    const today = dayjs().format('YYYY-MM-DD');
    const future = [...showtimes]
      .filter(st => (st.date || '') >= today)
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    return future[0]?.id ?? showtimes[0]?.id ?? null;
  }, [isCinemaGroup, routeEvent?.id, routeEvent?.showtimes]);
  const { data: detailData, isLoading: isDetailLoading } = useEventDetail(detailFetchId);

  // For cinema groups: never merge detailData.event — it would overwrite the
  // base title with a format-suffixed showtime title (e.g. "MOVIE (3D SUBT)").
  const event = isCinemaGroup
    ? routeEvent
    : (detailData ? { ...routeEvent, ...detailData.event } : routeEvent);
  const detailVenue = detailData?.venue || null;
  const reviews = detailData?.reviews || [];
  const averageRating = detailData?.averageRating ?? null;
  const reviewCount = detailData?.reviewCount ?? 0;
  const communityLinks = detailData?.communityLinks || [];

  const isSoldOut = !!(event?.isSoldOut);
  const isFree = Array.isArray(event?.priceRange)
    ? event.priceRange[0] === 0 && event.priceRange[1] === 0
    : event?.price === 0;
  const hasTicketUrl = !!event?.url;
  const isTicketmaster = !!event?.url?.includes('ticketmaster.cl');
  const { data: isSaved = false } = useIsEventSaved(routeEvent?.id);
  const toggleSave = useToggleSaveEvent(routeEvent?.id);

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [cinemaSelectedDate, setCinemaSelectedDate] = useState(null);
  const mapRef = useRef(null);
  const webMapRef = useRef(null);
  const [currentRegion, setCurrentRegion] = useState(null);

  // Collapsible description
  const DESC_COLLAPSED_LINES = 5;
  const DESC_LINE_HEIGHT = 22; // matches styles.description lineHeight
  const COLLAPSED_HEIGHT = DESC_COLLAPSED_LINES * DESC_LINE_HEIGHT;
  const [descExpanded, setDescExpanded] = useState(false);
  const [descFullHeight, setDescFullHeight] = useState(null);
  const [descNeedsCollapse, setDescNeedsCollapse] = useState(false);
  const descAnimHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

  useEffect(() => {
    if (descFullHeight === null) return;
    // Only animate if text is actually taller than the collapsed threshold
    if (descFullHeight <= COLLAPSED_HEIGHT) {
      setDescNeedsCollapse(false);
      return;
    }
    setDescNeedsCollapse(true);
    Animated.timing(descAnimHeight, {
      toValue: descExpanded ? descFullHeight : COLLAPSED_HEIGHT,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [descExpanded, descFullHeight]);

  const handleDescToggle = () => setDescExpanded(v => !v);

  // Collapsing header animation
  const scrollY = useRef(new Animated.Value(0)).current;

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, IMAGE_HEIGHT * 0.5, IMAGE_HEIGHT],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  const imageTranslateY = scrollY.interpolate({
    inputRange: [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT],
    outputRange: [IMAGE_HEIGHT / 2, 0, -IMAGE_HEIGHT * 0.4],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT],
    outputRange: [1.8, 1, 1],
    extrapolate: 'clamp',
  });

  const handleBackPress = () => navigation.goBack();

  const handleGetTickets = () => {
    if (isFree && !hasTicketUrl) {
      Alert.alert('Entrada Libre', 'Este evento es de entrada libre — no requiere ticket.');
      return;
    }
    if (event?.url) {
      Linking.openURL(event.url).catch(() =>
        Alert.alert('Error', 'No se pudo abrir el enlace.')
      );
    } else {
      Alert.alert('Sin enlace', 'Este evento no tiene URL de tickets.');
    }
  };

  const handleVenuePress = () => {
    const name = event?.venueName || event?.location;
    if (!name) return;
    navigation.navigate('VenueScreen', {
      venueId: detailVenue?.id || null,
      venueName: name,
    });
  };

  const formatEventDate = (dateString, hour) => {
    try {
      const date = dayjs(dateString);
      const formatted = date.isValid() ? date.format('D [de] MMMM') : dateString;
      return hour ? `${formatted}, ${hour}hrs` : formatted;
    } catch {
      return dateString;
    }
  };

  const isExposition = event?.type === 'Exposición';
  const displayDateTime = (() => {
    if (isExposition) {
      const dStart = event?.date ? dayjs(event.date) : null;
      const dEnd = event?.dateEnd ? dayjs(event.dateEnd) : null;
      if (dStart?.isValid() && dEnd?.isValid()) {
        return `${dStart.format('D [de] MMMM')} – ${dEnd.format('D [de] MMMM YYYY')}`;
      }
      if (dStart?.isValid()) {
        return `Desde ${dStart.format('D [de] MMMM')} · En curso`;
      }
    }
    return formatEventDate(event?.date, event?.timeStart || event?.hour);
  })();

  // Cinema group schedule
  const cinemaSchedule = useMemo(
    () => (isCinemaGroup ? getCinemaSchedule(event?.showtimes || [], 14) : []),
    [isCinemaGroup, event?.showtimes]
  );
  const effectiveCinemaDate = cinemaSelectedDate || cinemaSchedule[0]?.date || null;
  const selectedCinemaDayData = cinemaSchedule.find(s => s.date === effectiveCinemaDate);

  // Only allow writing reviews for past events
  const isEventPast = useMemo(() => {
    if (!event?.date) return false;
    const eventDate = dayjs(event.date);
    if (!eventDate.isValid()) return false;
    return eventDate.isBefore(dayjs(), 'day');
  }, [event?.date]);

  /** 1) coords del evento, 2) coords de la venue del detail, 3) fallback */
  const normalizedCoord = useMemo(() => {
    const fromEvent = normalizeLatLng(event?.coordinates);
    if (fromEvent) return fromEvent;

    if (detailVenue?.coordinates) return detailVenue.coordinates;

    return null;
  }, [event?.coordinates, detailVenue?.coordinates]);

  const STREET_ZOOM_DELTA = 0.00005;
  const initialRegion = normalizedCoord
    ? {
        latitude: normalizedCoord.latitude,
        longitude: normalizedCoord.longitude,
        latitudeDelta: STREET_ZOOM_DELTA,
        longitudeDelta: STREET_ZOOM_DELTA,
      }
    : {
        latitude: -33.4489,
        longitude: -70.6693,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  const products = detailData?.products || [];

  // communityLinks already declared above (from detailData)
  // showTrailerSection: true for cinema groups AND for individual Cine events opened
  // via other navigation paths (venue panel, search) that don't carry _isCinemaGroup.
  const showTrailerSection = isCinemaGroup || event?.category === 'Cine';
  const trailerLink = showTrailerSection
    ? communityLinks.find(l => l.platform === 'youtube') || null
    : null;
  // YouTube link shown as "Ver Trailer" button — always exclude from the community list.
  const visibleCommunityLinks = showTrailerSection
    ? communityLinks.filter(l => l.platform !== 'youtube')
    : communityLinks;

  // Hero image: for cinema groups, fall back to the freshly-fetched detailData image
  // because routeEvent.image may be stale/null if built before the TMDB enricher ran.
  const heroImage = isCinemaGroup
    ? (routeEvent?.image || detailData?.event?.image || null)
    : event?.image || null;

  // Check if event is Teatro, Cine, or Arte (for review section)
  const isReviewCategory = event?.category === 'Teatro' || event?.category === 'Cine' || event?.category === 'Arte';

  // Categories that should not show "Productos del Artista"
  const shouldHideProducts = isReviewCategory || event?.category === 'Comedia';

  // Only show review if the event actually has review data from backend
  const reviewData = event?.review || null;

  const hasProducts = products.length > 0 && !shouldHideProducts;
  const hasReview = isReviewCategory && reviewData?.text;
  // Never show Comunidad section for cinema events — trailer has its own button.
  const hasCommunity = !showTrailerSection && visibleCommunityLinks.length > 0;

  const handleUber = () => {
    const lat = normalizedCoord?.latitude;
    const lng = normalizedCoord?.longitude;
    const name = encodeURIComponent(event?.venueName || event?.location || 'Destino');
    const url = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${name}`;
    Linking.openURL(url);
  };

  const handleCabify = () => {
    const lat = normalizedCoord?.latitude;
    const lng = normalizedCoord?.longitude;
    const name = encodeURIComponent(event?.venueName || event?.location || 'Destino');
    const iosStore = 'https://apps.apple.com/cl/app/cabify/id476087442';
    const androidStore = 'https://play.google.com/store/apps/details?id=com.cabify.rider';
    const store = (Platform.OS === 'ios' || (Platform.OS === 'web' && /iPhone|iPad|iPod/.test(navigator.userAgent)))
      ? iosStore : androidStore;

    // Format A — flat query params, mirrors Uber's confirmed-working style
    const schemeA = `cabify://request?dropoff_latitude=${lat}&dropoff_longitude=${lng}&dropoff_nickname=${name}`;
    // Format B — JSON stops (previous attempt, kept as fallback)
    const schemeB = `cabify://cabify.com/city?json=${encodeURIComponent(JSON.stringify({ stops: [{ loc: [lng, lat], alias: decodeURIComponent(name) }] }))}`;

    if (Platform.OS === 'web') {
      window.location.href = schemeA;
      setTimeout(() => { window.open(store, '_blank'); }, 2000);
    } else {
      Linking.openURL(schemeA).catch(() =>
        Linking.openURL(schemeB).catch(() =>
          Linking.openURL(store)
        )
      );
    }
  };

  const openInGoogleMaps = () => {
    if (!normalizedCoord) return;
    const { latitude, longitude } = normalizedCoord;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir Google Maps'));
  };

  const handleZoomIn = () => {
    if (Platform.OS === 'web' && webMapRef.current) {
      const currentZoom = currentRegion?.latitudeDelta || initialRegion.latitudeDelta;
      const newDelta = currentZoom * 0.5; // Zoom in by halving the delta
      const newRegion = {
        ...(currentRegion || initialRegion),
        latitudeDelta: newDelta,
        longitudeDelta: newDelta,
      };
      webMapRef.current.animateToRegion(newRegion, 300);
      setCurrentRegion(newRegion);
    } else if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          ...(currentRegion || initialRegion),
          latitudeDelta: (currentRegion?.latitudeDelta || initialRegion.latitudeDelta) * 0.5,
          longitudeDelta: (currentRegion?.longitudeDelta || initialRegion.longitudeDelta) * 0.5,
        },
        300
      );
    }
  };

  const handleZoomOut = () => {
    if (Platform.OS === 'web' && webMapRef.current) {
      const currentZoom = currentRegion?.latitudeDelta || initialRegion.latitudeDelta;
      const newDelta = currentZoom * 2; // Zoom out by doubling the delta
      const newRegion = {
        ...(currentRegion || initialRegion),
        latitudeDelta: Math.min(newDelta, 0.5), // Cap at reasonable max
        longitudeDelta: Math.min(newDelta, 0.5),
      };
      webMapRef.current.animateToRegion(newRegion, 300);
      setCurrentRegion(newRegion);
    } else if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          ...(currentRegion || initialRegion),
          latitudeDelta: Math.min((currentRegion?.latitudeDelta || initialRegion.latitudeDelta) * 2, 0.5),
          longitudeDelta: Math.min((currentRegion?.longitudeDelta || initialRegion.longitudeDelta) * 2, 0.5),
        },
        300
      );
    }
  };

  const handleRegionChange = (region) => {
    setCurrentRegion(region);
  };

  return (
    <TabScreenLayout style={styles.container}>
      {/* Animated parallax header image — visual only, touch handled by heroTapOverlay below */}
      <Animated.View
        style={[
          styles.imageContainer,
          {
            opacity: imageOpacity,
            transform: [{ translateY: imageTranslateY }, { scale: imageScale }],
          },
        ]}
      >
        {heroImage ? (
          <Image source={{ uri: heroImage }} style={styles.image} />
        ) : (
          <View style={[styles.image, { backgroundColor: '#444' }]} />
        )}
      </Animated.View>

      {/* Lightbox Modal */}
      <Modal
        visible={lightboxVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.lightboxContainer}>
          {/* Tap anywhere on image or dark background to close */}
          <TouchableOpacity
            style={[styles.lightboxImageContainer, { width: screenWidth, height: screenHeight }]}
            onPress={() => setLightboxVisible(false)}
            activeOpacity={1}
          >
            {heroImage && (
              <Image
                source={{ uri: heroImage }}
                style={{ width: screenWidth, height: screenHeight }}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
          {/* X button rendered after image container so it sits on top (Android draw order) */}
          <TouchableOpacity
            style={[styles.lightboxCloseButton, { top: insets.top + 10 }]}
            onPress={() => setLightboxVisible(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: IMAGE_HEIGHT }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentCard}>
        <Text style={styles.title}>{event?.title || 'Evento'}</Text>

        {!!event?.description && (
          <View style={styles.descWrapper}>
            <Animated.View
              style={[
                styles.descAnimContainer,
                descNeedsCollapse && { height: descAnimHeight },
              ]}
            >
              {/* Hidden full-height text used only to measure the true height */}
              <Text
                style={[styles.description, styles.descMeasure]}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (descFullHeight === null) {
                    setDescFullHeight(h);
                    // Initialise the animated value synchronously to avoid flash
                    descAnimHeight.setValue(Math.min(h, COLLAPSED_HEIGHT));
                  }
                }}
              >
                {event.description}
              </Text>
              {/* Visible text — truncated when collapsed */}
              <Text
                style={styles.description}
                numberOfLines={descNeedsCollapse && !descExpanded ? DESC_COLLAPSED_LINES : undefined}
              >
                {event.description}
              </Text>
            </Animated.View>

            {/* Fade gradient shown only when collapsed and text overflows */}
            {descNeedsCollapse && !descExpanded && (
              <LinearGradient
                colors={['rgba(17,9,51,0)', '#110933']}
                style={styles.descFade}
                pointerEvents="none"
              />
            )}

            {/* Ver más / Ver menos button */}
            {descNeedsCollapse && (
              <TouchableOpacity
                onPress={handleDescToggle}
                activeOpacity={0.75}
                style={styles.descToggleBtn}
              >
                <Text style={styles.descToggleText}>
                  {descExpanded ? 'Ver menos' : 'Ver más'}
                </Text>
                <Ionicons
                  name={descExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={ACCENT}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {isCinemaGroup ? (
          <View style={styles.cinemaScheduleSection}>
            <Text style={styles.sectionTitle}>Horarios</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cinemaDateTabs}
            >
              {cinemaSchedule.map(({ date }) => {
                const active = effectiveCinemaDate === date;
                return (
                  <TouchableOpacity
                    key={date}
                    style={[styles.cinemaDateTab, active && styles.cinemaDateTabActive]}
                    onPress={() => setCinemaSelectedDate(date)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.cinemaDateTabText, active && styles.cinemaDateTabTextActive]}>
                      {formatScheduleDate(date)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {selectedCinemaDayData?.formats.map(({ format, times }) => (
              <View key={format} style={styles.cinemaFormatBlock}>
                <Text style={styles.cinemaFormatLabel}>{format}</Text>
                <View style={styles.cinemaTimePillRow}>
                  {times.map(time => (
                    <TouchableOpacity
                      key={time}
                      style={styles.cinemaTimePill}
                      onPress={handleGetTickets}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cinemaTimePillText}>{time}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.dateText}>
            {displayDateTime}
            {getEventPriceLabel(event) ? ` · ${getEventPriceLabel(event)}` : ''}
          </Text>
        )}

        {/* Ubicación (chip clickable) */}
        {!!(event?.venueName || event?.location) && (
          <TouchableOpacity style={styles.locationContainer} onPress={handleVenuePress}>
            <Ionicons name="location" size={18} color="#fff" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationText}>{event.venueName || event.location}</Text>
              {!!detailVenue?.address && (
                <Text style={styles.locationAddress}>{detailVenue.address}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Botón tickets */}
        <TouchableOpacity
          style={[
            styles.ticketButton,
            isCinemaGroup && styles.cinemaTicketButton,
            isSoldOut && styles.ticketButtonSoldOut,
            isFree && !hasTicketUrl && styles.ticketButtonFree,
          ]}
          onPress={handleGetTickets}
          activeOpacity={isFree && !hasTicketUrl ? 1 : 0.9}
        >
          <Text style={[
            styles.ticketButtonText,
            isSoldOut && styles.ticketButtonTextSoldOut,
            isFree && !hasTicketUrl && styles.ticketButtonTextFree,
          ]}>
            {isSoldOut
              ? 'Agotado'
              : isCinemaGroup
                ? 'Comprar tickets'
                : isFree && !hasTicketUrl
                  ? 'Entrada Libre'
                  : isFree && hasTicketUrl
                    ? 'Más Información'
                    : 'Obtener Tickets'}
          </Text>
        </TouchableOpacity>

        {/* Ver precios: Ticketmaster events whose price is not scraped */}
        {isTicketmaster && event?.price == null && !isSoldOut && (
          <TouchableOpacity
            style={styles.verPreciosLink}
            onPress={() => Linking.openURL(event.url).catch(() => {})}
            activeOpacity={0.7}
          >
            <Text style={styles.verPreciosText}>Ver precios en ticketmaster.cl →</Text>
          </TouchableOpacity>
        )}

        {/* Guardar plan */}
        <TouchableOpacity
          style={[styles.savePlanButton, isSaved && styles.savePlanButtonActive]}
          activeOpacity={0.8}
          onPress={() => toggleSave.mutate(isSaved)}
          disabled={toggleSave.isPending}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isSaved ? ACCENT : '#fff'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.savePlanText, isSaved && styles.savePlanTextActive]}>
            {isSaved ? 'Guardado en tus planes' : 'Guardar en tus planes'}
          </Text>
        </TouchableOpacity>

        {/* Botón trailer (cinema events — groups and standalone Cine) */}
        {showTrailerSection && !!trailerLink && (
          <TouchableOpacity
            style={styles.trailerButton}
            onPress={() =>
              Linking.openURL(trailerLink.url).catch(() =>
                Alert.alert('Error', 'No se pudo abrir el trailer.')
              )
            }
            activeOpacity={0.9}
          >
            <Ionicons name="logo-youtube" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.trailerButtonText}>Ver trailer</Text>
          </TouchableOpacity>
        )}

        {/* Mapa pequeño */}
        <View style={styles.mapWrapper}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            {normalizedCoord && (
              <TouchableOpacity onPress={openInGoogleMaps} style={styles.mapsBtn} activeOpacity={0.85}>
                <Ionicons name="navigate-outline" size={14} color="#22003D" />
                <Text style={styles.mapsBtnText}>Cómo llegar</Text>
              </TouchableOpacity>
            )}
          </View>

          {normalizedCoord && (
            <View style={styles.transportRow}>
              <TouchableOpacity style={styles.uberBtn} onPress={handleUber} activeOpacity={0.85}>
                <Text style={styles.uberText}>Uber</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cabifyBtn} onPress={handleCabify} activeOpacity={0.85}>
                <Text style={styles.cabifyText}>cabify</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.mapRoundedClip}>
            {Platform.OS === 'web' ? (
              <WebMap
                ref={webMapRef}
                apiKey={GOOGLE_MAPS_API_KEY}
                style={styles.smallMap}
                initialRegion={initialRegion}
                onRegionChange={handleRegionChange}
                venueMarkers={
                  normalizedCoord
                    ? [{
                        id: 'event-detail',
                        venueName: event?.venueName || event?.title || '',
                        latitude: normalizedCoord.latitude,
                        longitude: normalizedCoord.longitude,
                        pinColor: getEventPinColor(event),
                        eventCount: 1,
                      }]
                    : []
                }
              />
            ) : (
              <NativeMapView
                ref={mapRef}
                style={styles.smallMap}
                initialRegion={initialRegion}
                onRegionChangeComplete={handleRegionChange}
                scrollEnabled={true}
                zoomEnabled={true}
                zoomControlEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                showsUserLocation={false}
              >
                {normalizedCoord && (
                  <NativeMarker
                    coordinate={normalizedCoord}
                    anchor={{ x: 0.5, y: 1 }}
                    tracksViewChanges={false}
                    zIndex={10}
                  >
                    <View style={styles.venuePinContainer}>
                      <View style={[styles.venuePinGlow, { backgroundColor: getEventPinColor(event) + '25' }]} />
                      <View style={[styles.venuePinBody, { backgroundColor: getEventPinColor(event) }]}>
                        <View style={styles.venuePinShine} />
                        <View style={styles.venuePinSingleDot} />
                      </View>
                      <View style={[styles.venuePinPointer, { borderTopColor: getEventPinColor(event) }]} />
                      <View style={styles.venuePinShadow} />
                    </View>
                  </NativeMarker>
                )}
              </NativeMapView>
            )}
          </View>

          {!normalizedCoord && (
            <Text style={styles.mapNote}>
              Ubicación no disponible para este evento.
            </Text>
          )}
        </View>

        {/* Reviews */}
        <View style={styles.reviewsContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.sectionTitle}>Reseñas</Text>
            {reviewCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Stars rating={averageRating || 0} />
                <Text style={{ color: '#aaa', fontSize: 12, marginLeft: 6 }}>({reviewCount})</Text>
              </View>
            )}
          </View>
          {isDetailLoading ? (
            <Text style={{ color: '#aaa', fontSize: 14 }}>Cargando reseñas...</Text>
          ) : reviews.length === 0 ? (
            <Text style={{ color: '#aaa', fontSize: 14 }}>Aún no hay reseñas</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.reviewUser}>{r.user}</Text>
                  <Stars rating={r.rating} />
                </View>
                <Text style={styles.reviewComment}>{r.comment}</Text>
              </View>
            ))
          )}
          {isEventPast && (
            <TouchableOpacity style={styles.addReviewButton} activeOpacity={0.8} onPress={() => setReviewModalVisible(true)}>
              <Ionicons name="create-outline" size={16} color="#22003D" />
              <Text style={styles.addReviewText}>Escribir una reseña</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Products (merch, vinyl, cd) */}
        {hasProducts && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionTitle}>Productos del artista</Text>
            <View style={styles.productsGrid}>
              {products.map((p) => <ProductCard key={p.id || p.title} item={p} />)}
            </View>
          </View>
        )}

        {/* Crítica (for Teatro, Cine, Arte) */}
        {hasReview && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionTitle}>Crítica</Text>
            <View style={styles.reviewSection}>
              <Text style={styles.reviewText}>{reviewData.text}</Text>
              {reviewData.url && (
                <TouchableOpacity
                  style={styles.reviewLinkButton}
                  onPress={() => Linking.openURL(reviewData.url).catch(() => Alert.alert('Error', 'No se pudo abrir el enlace'))}
                  activeOpacity={0.8}
                >
                  <Ionicons name="open-outline" size={16} color="#BFA0FF" />
                  <Text style={styles.reviewLinkText}>
                    {reviewData.source || 'Leer crítica completa'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Community */}
        {hasCommunity && (
          <View style={{ marginTop: 16, marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Comunidad</Text>
            <View style={styles.linksRow}>
              {visibleCommunityLinks.map((link) => {
                const cfg = getPlatformConfig(link.platform);
                return (
                  <LinkPill
                    key={link.id}
                    pack={cfg.pack}
                    icon={cfg.icon}
                    label={cfg.label}
                    url={link.url}
                  />
                );
              })}
            </View>
          </View>
        )}
        </View>
      </Animated.ScrollView>

      <ReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        eventId={event?.id}
        eventName={event?.title}
      />

      {/* Hero image tap overlay — rendered after ScrollView so it wins the touch competition.
          The ScrollView (flex:1) covers the full screen and would intercept taps aimed at the
          hero Animated.View (zIndex:0) if the overlay were rendered before it. */}
      {!!heroImage && (
        <TouchableOpacity
          style={styles.heroTapOverlay}
          onPress={() => setLightboxVisible(true)}
          activeOpacity={0.85}
        />
      )}

      {/* Back button — rendered last so it always sits on top of the tap overlay */}
      <TouchableOpacity onPress={handleBackPress} style={[styles.backButton, { top: insets.top + 10 }]}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
    </TabScreenLayout>
  );
}

/* --- Estilos (estética Eventify) --- */
const CARD_BG = '#1A123D';
const ACCENT = '#BFA0FF';
const INK = '#22003D';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#110933' },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: IMAGE_HEIGHT,
    zIndex: 0,
    overflow: 'hidden',
  },
  image: { width: '100%', height: IMAGE_HEIGHT },
  contentCard: {
    backgroundColor: '#110933',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroTapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: IMAGE_HEIGHT,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 30,
    zIndex: 10,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 12 },
  description: { fontSize: 15, color: '#ccc', lineHeight: 22 },
  descWrapper: { marginBottom: 20 },
  descAnimContainer: { overflow: 'hidden' },
  // Positioned off-screen so it measures height without affecting layout
  descMeasure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
  },
  descFade: {
    position: 'absolute',
    bottom: 28, // sits just above the toggle button
    left: 0,
    right: 0,
    height: 48,
  },
  descToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  descToggleText: { color: ACCENT, fontSize: 14, fontWeight: '700' },
  dateText: { fontSize: 14, color: '#ddd', marginBottom: 10, fontWeight: '500' },

  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D0C6D',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  locationText: { color: '#fff', fontSize: 14 },
  locationAddress: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },

  ticketButton: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  ticketButtonSoldOut: {
    backgroundColor: 'rgba(229, 62, 62, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(229, 62, 62, 0.5)',
  },
  ticketButtonText: { color: INK, fontSize: 16, fontWeight: '700' },
  verPreciosLink: { marginTop: 10, alignSelf: 'flex-start', paddingVertical: 2 },
  verPreciosText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(191, 160, 255, 0.7)',
  },
  ticketButtonTextSoldOut: { color: '#E53E3E' },
  ticketButtonFree: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  ticketButtonTextFree: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  savePlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(191, 160, 255, 0.3)',
    backgroundColor: 'rgba(26, 18, 61, 0.6)',
    marginBottom: 8,
  },
  savePlanButtonActive: {
    borderColor: 'rgba(191, 160, 255, 0.5)',
    backgroundColor: 'rgba(155, 93, 229, 0.15)',
  },
  savePlanText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  savePlanTextActive: { color: ACCENT },

  mapWrapper: { marginTop: 8, marginBottom: 20 },

  // ── Venue pin (native) — identical to HomeScreen venuePinXxx styles ──
  venuePinContainer: {
    alignItems: 'center',
    width: 52,
    height: 58,
  },
  venuePinGlow: {
    position: 'absolute',
    top: -2,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  venuePinBody: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
      },
      android: { elevation: 8 },
    }),
  },
  venuePinShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
  },
  venuePinSingleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 1,
  },
  venuePinPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -3,
  },
  venuePinShadow: {
    width: 14,
    height: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginTop: 1,
  },
  mapsBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapsBtnText: { color: INK, fontWeight: '700', fontSize: 12 },
  mapRoundedClip: { borderRadius: 12, overflow: 'hidden', position: 'relative' },
  smallMap: { height: 160, width: '100%' },
  mapNote: { color: '#aaa', fontSize: 12, marginTop: 8 },

  reviewsContainer: { marginTop: 8, paddingBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 10 },
  reviewCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  reviewUser: { fontWeight: '700', color: '#fff', fontSize: 14 },
  reviewComment: { color: '#ccc', marginTop: 8, lineHeight: 20, fontSize: 13 },
  addReviewButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addReviewText: { color: INK, fontWeight: '700', fontSize: 13, marginLeft: 8 },

  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '47%',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#2B245C',
  },
  productTitle: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 4 },
  productPrice: { color: '#86D2FF', fontSize: 13, marginTop: 4, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#6F56E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  linksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linkPill: {
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  linkPillText: { color: INK, fontWeight: '700', fontSize: 13, marginLeft: 8 },

  // Review section styles
  reviewSection: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  reviewText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  reviewLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  reviewLinkText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    textDecorationLine: 'underline',
  },

  // Cinema schedule styles
  cinemaScheduleSection: { marginBottom: 16 },
  cinemaDateTabs: { gap: 8, paddingBottom: 14, paddingRight: 16 },
  cinemaDateTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: CINE_LIGHT,
    borderWidth: 1,
    borderColor: CINE_BORDER,
  },
  cinemaDateTabActive: { backgroundColor: CINE_BLUE, borderColor: CINE_BLUE },
  cinemaDateTabText: {
    color: '#A0B4FF',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    textTransform: 'capitalize',
  },
  cinemaDateTabTextActive: { color: '#fff', fontFamily: 'Outfit_600SemiBold' },
  cinemaFormatBlock: { marginBottom: 14 },
  cinemaFormatLabel: {
    color: '#A0B4FF',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  cinemaTimePillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cinemaTimePill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: CINE_LIGHT,
    borderWidth: 1,
    borderColor: CINE_BORDER,
  },
  cinemaTimePillText: { color: '#A0B4FF', fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  cinemaTicketButton: { backgroundColor: CINE_BLUE },
  trailerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF0000',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  trailerButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  uberBtn: {
    backgroundColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  uberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  cabifyBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  cabifyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Lightbox styles
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 24,
    padding: 10,
  },
  lightboxImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

