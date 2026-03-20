import React, { useMemo, useState, useRef } from 'react';
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
import ReviewModal from '../components/ReviewModal';
import { useIsEventSaved, useToggleSaveEvent } from '../hooks/useUserPreferences';
import { GOOGLE_MAPS_API_KEY } from '../config/env';

// Colores de pines
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
      {!!item?.price && (
        <Text style={styles.productPrice}>
          {item.currency || '$'}{item.price}
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
  const { data: detailData, isLoading: isDetailLoading } = useEventDetail(routeEvent?.id);

  // Merge: show route params immediately, overlay API data when ready
  const event = detailData ? { ...routeEvent, ...detailData.event } : routeEvent;
  const detailVenue = detailData?.venue || null;
  const reviews = detailData?.reviews || [];
  const averageRating = detailData?.averageRating ?? null;
  const reviewCount = detailData?.reviewCount ?? 0;

  const { data: isSaved = false } = useIsEventSaved(routeEvent?.id);
  const toggleSave = useToggleSaveEvent(routeEvent?.id);

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const mapRef = useRef(null);
  const webMapRef = useRef(null);
  const [currentRegion, setCurrentRegion] = useState(null);

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
    if (event?.url) {
      Linking.openURL(event.url).catch(() =>
        Alert.alert('Error', 'No se pudo abrir el enlace de tickets.')
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

  const displayDateTime = formatEventDate(event?.date, event?.timeStart || event?.hour);

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
  const communityLinks = detailData?.communityLinks || [];

  // Check if event is Teatro, Cine, or Arte (for review section)
  const isReviewCategory = event?.category === 'Teatro' || event?.category === 'Cine' || event?.category === 'Arte';
  
  // Categories that should not show "Productos del Artista"
  const shouldHideProducts = isReviewCategory || event?.category === 'Comedia';
  
  // Only show review if the event actually has review data from backend
  const reviewData = event?.review || null;

  const hasProducts = products.length > 0 && !shouldHideProducts;
  const hasReview = isReviewCategory && reviewData?.text;
  const hasCommunity = communityLinks.length > 0;

  const openInGoogleMaps = () => {
    if (!normalizedCoord) return;
    const { latitude, longitude } = normalizedCoord;
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
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
      {/* Animated parallax header image */}
      <Animated.View
        style={[
          styles.imageContainer,
          {
            opacity: imageOpacity,
            transform: [{ translateY: imageTranslateY }, { scale: imageScale }],
          },
        ]}
      >
        {event?.image ? (
          <TouchableOpacity onPress={() => setLightboxVisible(true)} activeOpacity={0.9}>
            <Image source={{ uri: event.image }} style={styles.image} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.image, { backgroundColor: '#444' }]} />
        )}
      </Animated.View>

      {/* Botón de volver */}
      <TouchableOpacity onPress={handleBackPress} style={[styles.backButton, { top: insets.top + 10 }]}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Lightbox Modal */}
      <Modal
        visible={lightboxVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
      >
        <View style={styles.lightboxContainer}>
          <TouchableOpacity
            style={styles.lightboxCloseButton}
            onPress={() => setLightboxVisible(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.lightboxImageContainer, { width: screenWidth, height: screenHeight }]}
            onPress={() => setLightboxVisible(false)}
            activeOpacity={1}
          >
            {event?.image && (
              <Image
                source={{ uri: event.image }}
                style={{ width: screenWidth, height: screenHeight }}
                resizeMode="contain"
              />
            )}
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

        {!!event?.description && <Text style={styles.description}>{event.description}</Text>}

        <Text style={styles.dateText}>
          {displayDateTime}
          {event?.price ? ` · Desde ${event.price}` : ''}
        </Text>

        {/* Ubicación (chip clickable) */}
        {!!(event?.venueName || event?.location) && (
          <TouchableOpacity style={styles.locationContainer} onPress={handleVenuePress}>
            <Ionicons name="location" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.locationText}>{event.venueName || event.location}</Text>
          </TouchableOpacity>
        )}

        {/* Botón tickets */}
        <TouchableOpacity style={styles.ticketButton} onPress={handleGetTickets} activeOpacity={0.9}>
          <Text style={styles.ticketButtonText}>Obtener Tickets</Text>
        </TouchableOpacity>

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

        {/* Mapa pequeño */}
        <View style={styles.mapWrapper}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            {normalizedCoord && (
              <TouchableOpacity onPress={openInGoogleMaps} style={styles.mapsBtn} activeOpacity={0.85}>
                <Ionicons name="navigate-outline" size={14} color="#22003D" />
                <Text style={styles.mapsBtnText}>Abrir en Maps</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.mapRoundedClip}>
            {Platform.OS === 'web' ? (
              <WebMap
                ref={webMapRef}
                apiKey={GOOGLE_MAPS_API_KEY}
                style={styles.smallMap}
                initialRegion={initialRegion}
                onRegionChange={handleRegionChange}
                eventMarkers={
                  normalizedCoord
                    ? [
                        {
                          id: 'e',
                          latitude: normalizedCoord.latitude,
                          longitude: normalizedCoord.longitude,
                          pinColor: getEventPinColor(event),
                        },
                      ]
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
                    title={event?.title}
                    description={event?.venueName || event?.location}
                    pinColor={getEventPinColor(event)}
                />
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
              {communityLinks.map((link) => {
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
  backButton: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 30,
    zIndex: 10,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 12 },
  description: { fontSize: 15, color: '#ccc', marginBottom: 20, lineHeight: 22 },
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

  ticketButton: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  ticketButtonText: { color: INK, fontSize: 16, fontWeight: '700' },
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

  // Lightbox styles
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  lightboxImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

