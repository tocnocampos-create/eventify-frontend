import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react-native';
import TabScreenLayout from '../components/TabScreenLayout';
import DiscoverVenueCard from '../components/discover/DiscoverVenueCard';
import { useVenues, useEvents } from '../hooks/useMapData';
import { useAppConfig, getCategoryBadgeColors } from '../hooks/useAppConfig';
import { formatEventDateTime, formatPrice } from '../utils/mapHelpers';
import { normalizeCategory } from '../utils/filters.schema';
import { categoryColors } from '../utils/pinColors';
import colors from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Hero images (same assets as CategoryGrid) ────────────────────────────────
const CATEGORY_IMAGES = {
  'Jazz':          require('../assets/categories/jazz.png'),
  'Comedia':       require('../assets/categories/comedy.png'),
  'Teatro':        require('../assets/categories/theater.png'),
  'Vida Nocturna': require('../assets/categories/nightlife.png'),
  'Nacional':      require('../assets/categories/nacional.png'),
  'Barrios':       require('../assets/categories/barrios.png'),
  'Al aire libre': require('../assets/categories/ecofriendly.png'),
  'Festivales':    require('../assets/categories/festivals.png'),
  'City Tour':     require('../assets/categories/ciudad.png'),
  'Museos':        require('../assets/categories/museos.png'),
  'Galerías':      require('../assets/categories/art.png'),
  'Cine':          require('../assets/categories/cinema.png'),
  'Sunsets':       require('../assets/categories/sunsets.png'),
  'Ferias':        require('../assets/categories/ferias.png'),
  'Familiar':      require('../assets/categories/familiar.png'),
};

// ── Creative copy ─────────────────────────────────────────────────────────────
const CATEGORY_COPY = {
  'Jazz': {
    tagline: 'Tu próxima cita con notas de jazz y buena conversación está aquí',
    emptyMessage: 'Estamos afinando los mejores conciertos de jazz para ti. Vuelve pronto.',
  },
  'Comedia': {
    tagline: 'Porque reírse es la mejor forma de terminar la semana',
    emptyMessage: 'Los comediantes están preparando su mejor material. Muy pronto.',
  },
  'Teatro': {
    tagline: 'Historias que te van a quitar el aliento desde la primera fila',
    emptyMessage: 'El telón está por subir. Pronto tendremos la cartelera completa.',
  },
  'Vida Nocturna': {
    tagline: 'La ciudad no duerme y tú tampoco deberías. Encuentra tu noche perfecta',
    emptyMessage: 'La noche se está preparando. Vuelve cuando caiga el sol.',
  },
  'Nacional': {
    tagline: 'La música que nos define. Folclore, cumbia y los sonidos que nacieron aquí',
    emptyMessage: 'Estamos preparando la mejor selección de música nacional. Vuelve pronto.',
  },
  'Barrios': {
    tagline: 'Cada barrio tiene su historia. Descubre la ciudad caminando',
    emptyMessage: 'Estamos mapeando los mejores rincones de la ciudad para ti.',
  },
  'Al aire libre': {
    tagline: 'Sal de cuatro paredes. La ciudad tiene más espacio del que imaginas',
    emptyMessage: 'Pronto tendremos los mejores panoramas al aire libre de la ciudad.',
  },
  'Festivales': {
    tagline: 'Grandes escenarios, mejores momentos. Los eventos que no te puedes perder',
    emptyMessage: 'La próxima temporada de festivales se está preparando. Muy pronto.',
  },
  'City Tour': {
    tagline: 'Santiago tiene secretos. Déjate sorprender por tu propia ciudad',
    emptyMessage: 'Estamos preparando los mejores tours para ti. Muy pronto verás la ciudad con otros ojos.',
  },
  'Museos': {
    tagline: 'Arte, historia y cultura en un mismo lugar. La ciudad tiene mucho que contarte',
    emptyMessage: 'Estamos preparando las mejores exposiciones y visitas. Vuelve pronto.',
  },
  'Galerías': {
    tagline: 'El arte contemporáneo tiene su espacio. Descubre lo que se está creando hoy',
    emptyMessage: 'Las galerías están preparando sus próximas exposiciones. Muy pronto.',
  },
  'Cine': {
    tagline: 'Grandes historias en pantalla grande. Elige tu próxima película favorita',
    emptyMessage: 'La cartelera se está actualizando. Vuelve pronto para ver los próximos estrenos.',
  },
  'Sunsets': {
    tagline: 'El mejor momento del día merece el mejor lugar. Encuentra tu atardecer perfecto',
    emptyMessage: 'Estamos buscando los mejores spots para ver el atardecer. Muy pronto.',
  },
  'Ferias': {
    tagline: 'Diseño, gastronomía y cultura en un solo lugar. El mercado de la ciudad',
    emptyMessage: 'Las próximas ferias y mercados se están organizando. Vuelve pronto.',
  },
  'Familiar': {
    tagline: 'Porque los mejores momentos son los que compartes en familia',
    emptyMessage: 'Estamos preparando los mejores panoramas para toda la familia. Muy pronto.',
  },
};

// ── Event filter spec (mirrors PILL_CATEGORY_FILTER_MAP in EventsScreen) ─────
const EVENT_FILTER_SPEC = {
  'Jazz':          { keywords: ['jazz', 'blues', 'swing'], types: ['Jazz'] },
  'Comedia':       { keywords: ['comedia', 'stand up', 'humor'], categories: ['Comedia'] },
  'Teatro':        { keywords: ['teatro', 'obra', 'drama', 'tragicomedia', 'monólogo'],
                     categories: ['Teatro'] },
  'Vida Nocturna': { keywords: ['vida nocturna', 'dj', 'club', 'boliche', 'after', 'nocturno'] },
  'Nacional':      { keywords: ['folclore', 'folklore', 'cueca', 'música nacional',
                                 'banda chilena', 'artista chileno', 'cumbia chilena', 'latin folk'] },
  'Barrios':       { keywords: ['barrio italia', 'lastarria', 'bellavista', 'brasil',
                                 'yungay', 'patrimonio', 'ruta cultural'] },
  'Al aire libre': { keywords: ['aire libre', 'outdoor', 'parque', 'festival', 'anfiteatro'] },
  'Festivales':    { keywords: ['festival', 'aire libre', 'outdoor', 'anfiteatro'] },
  'City Tour':     { keywords: ['city tour', 'tour', 'turismo', 'visita guiada',
                                 'centro histórico', 'ruta patrimonial', 'la moneda'] },
  'Museos':        { keywords: ['museo', 'colección'] },
  'Galerías':      { keywords: ['galería', 'arte', 'exposición'] },
  'Cine':          { keywords: ['cine', 'película', 'film', 'proyección'], categories: ['Cine'] },
  'Sunsets':       { keywords: ['sunset', 'atardecer', 'happy hour', 'rooftop', 'terraza'] },
  'Ferias':        { keywords: ['feria', 'mercado', 'bazar', 'food market'] },
  'Familiar':      { keywords: ['familiar', 'infantil', 'niños', 'kids', 'todas las edades'] },
};

// ── Venue type filter spec ────────────────────────────────────────────────────
const VENUE_TYPE_SPEC = {
  'Jazz':          ['Bar', 'Sala de Concierto', 'Club', 'Pub'],
  'Teatro':        ['Teatro', 'Centro Cultural', 'Sala de Espectáculos'],
  'Comedia':       ['Teatro', 'Bar', 'Centro Cultural'],
  'Vida Nocturna': ['Club', 'Bar', 'Discoteca', 'Pub', 'Boliche'],
  'Nacional':      ['Bar', 'Sala de Concierto', 'Club'],
  'Barrios':       ['Bar', 'Centro Cultural', 'Teatro'],
  'Al aire libre': ['Parque', 'Cerro', 'Bosque', 'Santuario', 'Monumento Natural', 'Parque Nacional', 'Salto'],
  'Festivales':    ['Arena'],
  'City Tour':     ['Museo', 'Centro Cultural'],
  'Museos':        ['Museo'],
  'Galerías':      ['Galería', 'Centro Cultural'],
  'Cine':          ['Cine'],
  'Sunsets':       ['Bar', 'Club'],
  'Ferias':        ['Arena', 'Centro Cultural'],
  'Familiar':      ['Teatro', 'Museo', 'Arena'],
};

// ── Filter helpers ────────────────────────────────────────────────────────────
function buildEventFilter(categoryKey) {
  const spec = EVENT_FILTER_SPEC[categoryKey];
  if (!spec) return () => false;
  return (event) => {
    if (spec.categories?.length) {
      const catLower = (event.category || '').toLowerCase();
      return spec.categories.some(c => c.toLowerCase() === catLower);
    }
    const kwsLower = (event.keywords || []).map(k => k.toLowerCase());
    if (spec.keywords?.some(kw => kwsLower.includes(kw.toLowerCase()))) return true;
    const typeLower = (event.type || '').toLowerCase();
    if (spec.types?.some(t => t.toLowerCase() === typeLower)) return true;
    return false;
  };
}

function buildVenueFilter(categoryKey) {
  const types = VENUE_TYPE_SPEC[categoryKey];
  if (!types?.length) return () => false;
  const typesLower = types.map(t => t.toLowerCase());
  return (venue) => typesLower.includes((venue.type || '').toLowerCase());
}

// ── Sub-components ────────────────────────────────────────────────────────────
function EventCard({ item, badgeColors, onPress }) {
  const category = normalizeCategory(item?.category);
  const catColor = categoryColors[category] || colors.primary;
  const badgeBg = badgeColors[category] || 'rgba(159, 123, 255, 0.2)';

  return (
    <TouchableOpacity style={styles.eventCard} activeOpacity={0.9} onPress={onPress}>
      {item?.image ? (
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(15, 5, 35, 0.85)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={styles.badgeText}>{category}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.cardImageWrap, styles.cardImagePlaceholder]}>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={styles.badgeText}>{category}</Text>
          </View>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item?.title || ''}</Text>
        <View style={styles.metaRow}>
          <Calendar size={13} color={colors.textDim} />
          <Text style={styles.metaText}>{formatEventDateTime(item)}</Text>
        </View>
        {!!item?.location && (
          <View style={styles.metaRow}>
            <MapPin size={13} color={colors.textDim} />
            <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
          </View>
        )}
        {item?.price != null && (
          <Text style={styles.cardPrice}>
            {item.price === 0 ? 'Gratis' : `Desde ${formatPrice(item.price)}`}
          </Text>
        )}
      </View>
      <LinearGradient
        colors={[catColor, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.cardAccent}
      />
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CategoryScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { categoryKey } = route.params || {};

  const copy = CATEGORY_COPY[categoryKey] || {
    tagline: 'Descubre los mejores eventos de la ciudad',
    emptyMessage: 'No hay eventos disponibles por ahora. Vuelve pronto.',
  };
  const heroImage = CATEGORY_IMAGES[categoryKey];
  const catColor = categoryColors[normalizeCategory(categoryKey)] || colors.primary;

  const { data: config } = useAppConfig();
  const badgeColors = getCategoryBadgeColors(config?.categories);

  const { data: venues = [] } = useVenues();
  const { data: events = [] } = useEvents(venues);

  const filteredEvents = useMemo(
    () => events.filter(buildEventFilter(categoryKey)),
    [events, categoryKey],
  );

  const filteredVenues = useMemo(
    () => venues.filter(buildVenueFilter(categoryKey)),
    [venues, categoryKey],
  );

  const navigateToVenue = (venue) =>
    navigation.navigate('VenueScreen', {
      venueId: venue.id,
      venueName: venue.name,
      venueType: venue.type,
      venueCity: venue.city,
      coverImage: venue.coverImage,
      profileImage: venue.profileImage,
      menuPdfUrl: venue.menuPdfUrl,
    });

  const listHeader = (
    <View>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        {heroImage ? (
          <ImageBackground source={heroImage} style={styles.heroImage} resizeMode="cover">
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(10,2,28,0.93)']}
              style={StyleSheet.absoluteFillObject}
            />
          </ImageBackground>
        ) : (
          <View style={[styles.heroImage, { backgroundColor: catColor }]}>
            <LinearGradient
              colors={['transparent', 'rgba(10,2,28,0.93)']}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
        )}

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.backButtonInner}>
            <ArrowLeft size={18} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Title + tagline */}
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>{categoryKey}</Text>
          <Text style={styles.heroTagline}>{copy.tagline}</Text>
        </View>
      </View>

      {/* ── Venues carousel ────────────────────────────────────────────────── */}
      {filteredVenues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lugares destacados</Text>
          <FlatList
            horizontal
            data={filteredVenues}
            keyExtractor={(v) => String(v.id)}
            renderItem={({ item }) => (
              <DiscoverVenueCard venue={item} onPress={() => navigateToVenue(item)} />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.venueList}
          />
        </View>
      )}

      {/* ── Events section header ──────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Próximos eventos</Text>
      </View>
    </View>
  );

  return (
    <TabScreenLayout style={styles.container}>
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <EventCard
            item={item}
            badgeColors={badgeColors}
            onPress={() => navigation.navigate('EventDetail', { event: item })}
          />
        )}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{copy.emptyMessage}</Text>
          </View>
        }
      />
    </TabScreenLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingBottom: 100,
  },

  // Hero
  hero: {
    width: '100%',
    height: 260,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    left: 16,
    zIndex: 10,
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 34,
    fontFamily: 'Outfit_700Bold',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    lineHeight: 20,
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: colors.text,
    marginBottom: 12,
  },

  // Venues carousel
  venueList: {
    paddingRight: 16,
  },

  // Event cards
  eventCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(28, 10, 62, 0.82)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
             shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.35)' },
    }),
  },
  cardImageWrap: {
    position: 'relative',
    height: 160,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    backgroundColor: 'rgba(44, 0, 95, 0.4)',
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
  cardInfo: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
    flexShrink: 1,
  },
  cardPrice: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.primary,
    marginTop: 8,
  },
  cardAccent: {
    height: 3,
  },

  // Empty state
  emptyState: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(28, 10, 62, 0.6)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 22,
  },
});
