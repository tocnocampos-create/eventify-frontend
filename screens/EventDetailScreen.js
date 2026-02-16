import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Alert,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import TabScreenLayout from '../components/TabScreenLayout';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import WebMap from '../components/WebMap';
import { MapView as NativeMapView, Marker as NativeMarker } from '../components/NativeMap';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import { useVenues } from '../hooks/useMapData';
import { normalizeCategory } from '../utils/filters.schema.js';

// Colores de pines
const PIN_PURPLE = '#9F7BFF';
const PIN_TEATRO = '#3B82F6'; // vibrant bright blue para eventos de Teatro
const PIN_COMEDIA = '#FF69B4'; // vibrant pink para eventos de Comedia
const PIN_ARTE = '#00BCD4'; // vibrant cyan/turquoise para eventos de Arte
const PIN_CINE = '#3B52D8'; // deep blue para eventos de Cine

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

/* --- Datos de ejemplo (fallback para MVP) --- */
const SAMPLE_PRODUCTS = [
  {
    id: 'v1',
    title: 'Vinilo Edición Limitada',
    price: '30.000',
    currency: '$',
    type: 'Vinyl',
    image: 'https://umusicstore.cl/cdn/shop/products/Vinilo_1_b.png?v=1665163970&width=1000',
    url: 'https://disqueriachilena.cl/categoriasscd/vinilos',
  },
  {
    id: 'c1',
    title: 'CD Concierto en Vivo',
    price: '14.000',
    currency: '$',
    type: 'CD',
    image: 'https://m.media-amazon.com/images/I/71TmKTIdkkL._UF1000,1000_QL80_.jpg',
    url: 'https://disqueriachilena.cl/categoriasscd/vinilos',
  },
  {
    id: 'm1',
    title: 'Polera',
    price: '25.000',
    currency: '$',
    type: 'Merch',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_5V7DIWtG1mDkiZ2mqYr39arod_9ircrSkw&',
    url: 'https://www.latiendanacional.cl/shop',
  },
  {
    id: 'm2',
    title: 'Afiche',
    price: '5.000',
    currency: '$',
    type: 'Merch',
    image: 'https://i0.wp.com/www.printmag.com/wp-content/uploads/2021/08/fdcd5a_0bea759ede2e4019abf733f0944564c7mv2.jpg?w=1000&quality=89&ssl=1',
    url: 'https://www.latiendanacional.cl/shop',
  },
];

const SAMPLE_COMMUNITY = {
  tiktok: 'https://www.tiktok.com/@eventify.live',
  instagram: 'https://www.instagram.com/eventify.live/',
  website: 'https://eventifyapp.cl/',
};

/* --- Reviews de ejemplo --- */
const fakeReviews = [
  { id: 1, user: 'Luis Jara', rating: 5, comment: 'Excelente puesta en escena, experiencia top de principio a fin.' },
  { id: 2, user: 'Diego Soto', rating: 4, comment: 'Muy buen sonido, de mis salas favoritas en Santiago.' },
  { id: 3, user: 'Carolina Díaz', rating: 5, comment: 'Ambiente increíble y organización impecable. Lo repetiría.' },
];

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

/** Busca venue por nombre y devuelve coords normalizadas */
function getVenueCoordsByName(name, venues) {
  if (!name || !Array.isArray(venues)) return null;
  const v = venues.find((vn) => vn?.name && vn.name.toLowerCase() === String(name).toLowerCase());
  if (!v) return null;

  // Soporta varios formatos en venues.js
  return (
    normalizeLatLng(v.coordinates) ||
    (Number.isFinite(toNum(v.latitude)) && Number.isFinite(toNum(v.longitude))
      ? { latitude: toNum(v.latitude), longitude: toNum(v.longitude) }
      : normalizeLatLng([v.lat, v.lng]))
  );
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
  const navigation = useNavigation();
  const route = useRoute();
  const { event } = route.params;
  const { data: venuesData = [] } = useVenues();
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const mapRef = useRef(null);
  const webMapRef = useRef(null);
  const [currentRegion, setCurrentRegion] = useState(null);

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
    const venueName = event?.venueName || event?.location;
    if (!venueName) return;
    navigation.navigate('VenueScreen', { venueName });
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

  /** 1) coords del evento, 2) coords de la venue, 3) fallback */
  const normalizedCoord = useMemo(() => {
    const fromEvent = normalizeLatLng(event?.coordinates);
    if (fromEvent) return fromEvent;

    const venueName = event?.venueName || event?.location;
    const fromVenue = getVenueCoordsByName(venueName, venuesData);
    if (fromVenue) return fromVenue;

    return null;
  }, [event?.coordinates, event?.venueName, event?.location, venuesData]);

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

  // FALLBACKS para MVP
  const products = Array.isArray(event?.products) && event.products.length > 0 ? event.products : SAMPLE_PRODUCTS;
  const community = event?.community ? event.community : SAMPLE_COMMUNITY;

  // Check if event is Teatro, Cine, or Arte (for review section)
  const isReviewCategory = event?.category === 'Teatro' || event?.category === 'Cine' || event?.category === 'Arte';
  
  // Categories that should not show "Productos del Artista"
  const shouldHideProducts = isReviewCategory || event?.category === 'Comedia';
  
  // Sample review data (can be replaced with actual event.review data)
  const reviewData = event?.review || {
    text: 'Una obra magistral que combina elementos visuales y narrativos de manera excepcional. La dirección y el elenco logran crear una experiencia inmersiva que no te puedes perder.',
    url: 'https://example.com/review',
    source: 'Crítica Especializada'
  };

  const hasProducts = products && products.length > 0 && !shouldHideProducts;
  const hasReview = isReviewCategory && reviewData?.text;
  const hasCommunity = !!(community?.tiktok || community?.instagram || community?.website);

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
      {/* Imagen del evento */}
      {event?.image ? (
        <TouchableOpacity onPress={() => setLightboxVisible(true)} activeOpacity={0.9}>
          <Image source={{ uri: event.image }} style={styles.image} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.image, { backgroundColor: '#444' }]} />
      )}

      {/* Botón de volver */}
      <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
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
            style={styles.lightboxImageContainer}
            onPress={() => setLightboxVisible(false)}
            activeOpacity={1}
          >
            {event?.image && (
              <Image
                source={{ uri: event.image }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      <ScrollView style={styles.detailsContainer} contentContainerStyle={{ paddingBottom: 20 }}>
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
        <TouchableOpacity style={styles.savePlanButton} activeOpacity={0.8}>
          <Text style={styles.savePlanText}>Guardarlo en tus planes</Text>
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
                apiKey={"AIzaSyBJymkbeUvctbb43PnnTUZ9GQNo6IeEwd0"}
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
              No hay coordenadas exactas para este evento ni para su venue. Carga lat/long en <Text style={{ fontWeight: '700' }}>events.js</Text> o en <Text style={{ fontWeight: '700' }}>venues.js</Text>.
            </Text>
          )}
        </View>

        {/* Reviews */}
        <View style={styles.reviewsContainer}>
            <Text style={styles.sectionTitle}>Reseñas</Text>
          {fakeReviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.reviewUser}>{r.user}</Text>
                <Stars rating={r.rating} />
              </View>
              <Text style={styles.reviewComment}>{r.comment}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.addReviewButton} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={16} color="#22003D" />
            <Text style={styles.addReviewText}>Escribir una reseña</Text>
          </TouchableOpacity>
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
              <LinkPill pack="mci" icon="music-note" label="TikTok" url={community?.tiktok} />
              <LinkPill icon="logo-instagram" label="Instagram" url={community?.instagram} />
              <LinkPill icon="link-outline" label="Sitio Web" url={community?.website} />
            </View>
          </View>
        )}
      </ScrollView>
    </TabScreenLayout>
  );
}

/* --- Estilos (estética Eventify) --- */
const CARD_BG = '#1A123D';
const ACCENT = '#BFA0FF';
const INK = '#22003D';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#110933' },
  image: { width: '100%', height: 260 },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 30,
    zIndex: 10,
  },
  detailsContainer: { paddingHorizontal: 20, paddingTop: 20 },
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
  savePlanButton: { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  savePlanText: { color: '#aaa', fontSize: 14 },

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
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});

