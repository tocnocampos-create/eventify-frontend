import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TabScreenLayout from '../components/TabScreenLayout';
import GlassOverlay from '../components/home/GlassOverlay';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import {
  Search,
  X,
  Compass,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import { useDiscover } from '../hooks/useDiscover';
import { useVenues, useEvents } from '../hooks/useMapData';
import { useSearch } from '../hooks/useSearch';
import { useAuth } from '../contexts/AuthContext';
import Slider from '../components/CrossPlatformSlider';
import colors from '../theme/colors';
import { useAppConfig, getCategoryBadgeColors } from '../hooks/useAppConfig';
import DiscoverEventCard from '../components/discover/DiscoverEventCard';
import DiscoverVenueCard from '../components/discover/DiscoverVenueCard';
import DiscoverSection from '../components/discover/DiscoverSection';
import CategoryGrid from '../components/discover/CategoryGrid';

// Maps each SearchScreen pill key to the params forwarded to EventsScreen.
// pillCategoryKey drives both client-side (getCategoryFilter) and server-side
// (keyword_category backend param) filtering against the events.keywords array.
const SEARCH_CATEGORY_MAP = {
  'Jazz':          { pillCategoryKey: 'Jazz' },
  'Comedia':       { pillCategoryKey: 'Comedia' },
  'Nacional':      { pillCategoryKey: 'Nacional' },
  'Teatro':        { pillCategoryKey: 'Teatro' },
  'Vida Nocturna': { pillCategoryKey: 'Vida Nocturna' },
  'Galerías':      { pillCategoryKey: 'Galerías' },
  'Barrios':       { pillCategoryKey: 'Barrios' },
  'Festivales':    { pillCategoryKey: 'Festivales' },
  'Cine':          { pillCategoryKey: 'Cine' },
  'Museos':        { pillCategoryKey: 'Museos' },
  'Al aire libre': { pillCategoryKey: 'Al aire libre' },
  'Sunsets':       { pillCategoryKey: 'Sunsets' },
  'Familiar':      { pillCategoryKey: 'Familiar' },
  'Ferias':        { pillCategoryKey: 'Ferias' },
  'City Tour':     { pillCategoryKey: 'City Tour' },
};

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState(null);
  const [city, setCity] = useState('Santiago');
  const [radius, setRadius] = useState(10);
  const [radiusModalVisible, setRadiusModalVisible] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVenueType, setSelectedVenueType] = useState(null);

  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const { data: config } = useAppConfig();
  const badgeColors = getCategoryBadgeColors(config?.categories);
  const availableCities = config?.available_cities || ['Santiago'];

  const {
    data: discover,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useDiscover({
    lat: location?.coords?.latitude,
    lon: location?.coords?.longitude,
    city,
    radiusKm: radius,
  });

  // Full dataset for free-text search — React Query caches these globally
  // so they are free if HomeScreen already fetched them.
  const { data: venues = [], isLoading: venuesLoading } = useVenues();
  const { data: events = [], isLoading: eventsLoading } = useEvents(venues);
  const searchDataLoading = venuesLoading || eventsLoading;

  // Structured filter search via GET /api/search
  const hasStructuredFilter = !!(selectedCategory || selectedVenueType);
  const {
    data: searchResults,
    isLoading: searchLoading,
    isError: searchError,
  } = useSearch({
    venueType: selectedVenueType || undefined,
    eventCategory: selectedCategory || undefined,
  });

  // Request location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
        const geo = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        const detectedCity = geo[0]?.city || geo[0]?.subAdministrativeArea;
        if (detectedCity && availableCities.includes(detectedCity)) {
          setCity(detectedCity);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    })();
  }, []);

  // Free-text search against the full venues/events dataset
  const getFilteredResults = useCallback(() => {
    if (!searchQuery) return { events: [], venues: [] };
    const q = searchQuery.toLowerCase();

    const matchedEvents = events.filter(
      (e) =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q)
    );

    const matchedVenues = venues.filter(
      (v) =>
        (v.name || '').toLowerCase().includes(q) ||
        (v.type || '').toLowerCase().includes(q) ||
        (v.city || '').toLowerCase().includes(q)
    );

    return { events: matchedEvents, venues: matchedVenues };
  }, [searchQuery, events, venues]);

  const filtered = getFilteredResults();
  const showSearchLoading = searchQuery.length > 0 && searchDataLoading;
  const showDropdown = searchQuery.length > 0 && !searchDataLoading && (filtered.events.length > 0 || filtered.venues.length > 0);

  const navigateToEvent = (event) => navigation.navigate('EventDetail', { event });
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

  const handleCategoryPress = (categoryKey) => {
    const key = (categoryKey || '').trim();
    const spec = SEARCH_CATEGORY_MAP[key] || {};
    navigation.navigate('Events', {
      screen: 'EventsMain',
      params: {
        pillCategoryKey: spec.pillCategoryKey || null,
        initialCategory: spec.category || null,
        initialTypes: spec.types || null,
        initialVenueType: spec.initialVenueType || null,
        pillTimeFilter: spec.pillTimeFilter || null,
        pillKeywordFilter: spec.pillKeywordFilter || null,
        initialQuery: spec.initialQuery || null,
      },
    });
  };

  const handleRecommendedPress = (query) => {
    navigation.navigate('Events', {
      screen: 'EventsMain',
      params: { initialQuery: query },
    });
  };

  const recommended = config?.recommended_searches || [
    'Salas de Concierto',
    'Museos en un día',
    'Barrio Italia',
    'Imperdibles de la ciudad',
    'Ruta patrimonial',
    'Eventos gratuitos',
    'Mercado París-Londres',
  ];

  return (
    <TabScreenLayout style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.content}>

          {/* Location + Filter Pill */}
          <View style={styles.explorarRow}>
            <TouchableOpacity
              onPress={() => setRadiusModalVisible(true)}
              activeOpacity={0.8}
              style={{ flex: 1 }}
            >
              <GlassOverlay borderRadius={12} style={styles.explorarButton}>
                <Compass size={18} color={colors.primary} />
                <Text style={styles.explorarText} numberOfLines={1}>
                  {city || 'Santiago'} ({radius} km)
                  {selectedCategory ? ` · ${selectedCategory}` : ''}
                  {selectedVenueType ? ` · ${selectedVenueType}` : ''}
                </Text>
                <SlidersHorizontal size={16} color={hasStructuredFilter ? colors.primary : colors.textDim} />
              </GlassOverlay>
            </TouchableOpacity>
            {hasStructuredFilter && (
              <TouchableOpacity
                onPress={() => { setSelectedCategory(null); setSelectedVenueType(null); }}
                style={styles.clearFiltersButton}
              >
                <X size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Input */}
          <View style={styles.searchWrapper}>
            <GlassOverlay borderRadius={16} style={styles.searchGlass}>
              <View style={styles.searchInner}>
                <Search size={18} color={colors.textDim} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Eventos, venues o artistas"
                  placeholderTextColor={colors.textDim}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setSearchQuery('')}
                  >
                    <X color={colors.primary} size={18} />
                  </TouchableOpacity>
                )}
              </View>
            </GlassOverlay>

            {/* Search loading indicator */}
            {showSearchLoading && (
              <View style={styles.resultSection}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}

            {/* Search Results Dropdown */}
            {showDropdown && (
              <View style={styles.resultSection}>
                <ScrollView>
                  {filtered.events.length > 0 && (
                    <View>
                      <Text style={styles.resultTitle}>Próximos Eventos</Text>
                      {filtered.events.map((e, i) => (
                        <TouchableOpacity
                          key={`ev-${e.id || i}`}
                          style={styles.resultCard}
                          onPress={() => navigateToEvent(e)}
                        >
                          <Text style={styles.resultName}>{e.title}</Text>
                          <Text style={styles.resultType}>{e.location}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {filtered.venues.length > 0 && (
                    <View>
                      <Text style={styles.resultTitle}>Venues</Text>
                      {filtered.venues.map((v, i) => (
                        <TouchableOpacity
                          key={`venue-${v.id || i}`}
                          style={styles.resultCard}
                          onPress={() => navigateToVenue(v)}
                        >
                          <Text style={styles.resultName}>{v.name}</Text>
                          <Text style={styles.resultType}>{v.type} · {v.city}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Loading */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          )}

          {/* Error */}
          {isError && !isLoading && (
            <View style={styles.loadingContainer}>
              <GlassOverlay borderRadius={12} style={styles.errorContainer}>
                <Text style={styles.errorText}>Error al cargar. Intenta de nuevo.</Text>
                <TouchableOpacity onPress={refetch} style={styles.retryButton}>
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
              </GlassOverlay>
            </View>
          )}

          {/* Structured filter results */}
          {hasStructuredFilter && (
            <>
              {searchLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Buscando...</Text>
                </View>
              )}
              {searchError && !searchLoading && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.errorText}>Error al buscar. Intenta de nuevo.</Text>
                </View>
              )}
              {!searchLoading && !searchError && searchResults && (
                <View style={styles.structuredResults}>
                  {searchResults.venues?.length > 0 && (
                    <View>
                      <Text style={styles.sectionTitle}>Venues</Text>
                      {searchResults.venues.map((v, i) => (
                        <TouchableOpacity
                          key={`sv-${v.id || i}`}
                          style={[styles.resultCard, styles.structuredCard]}
                          onPress={() => navigateToVenue(v)}
                        >
                          <Text style={styles.resultName}>{v.name}</Text>
                          <Text style={styles.resultType}>{v.type}{v.city ? ` · ${v.city}` : ''}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {searchResults.events?.length > 0 && (
                    <View>
                      <Text style={styles.sectionTitle}>Eventos</Text>
                      {searchResults.events.map((e, i) => (
                        <TouchableOpacity
                          key={`se-${e.id || i}`}
                          style={[styles.resultCard, styles.structuredCard]}
                          onPress={() => navigateToEvent(e)}
                        >
                          <Text style={styles.resultName}>{e.title}</Text>
                          <Text style={styles.resultType}>{e.location}{e.category ? ` · ${e.category}` : ''}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {searchResults.venues?.length === 0 && searchResults.events?.length === 0 && (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>Sin resultados para los filtros seleccionados.</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {/* Discovery sections — only when not loading, no error, and no structured filter active */}
          {!hasStructuredFilter && !isLoading && !isError && discover && (
            <>
              {/* Hoy en [city] */}
              <DiscoverSection
                title={`Hoy en ${city}`}
                data={discover.today}
                renderItem={({ item }) => (
                  <DiscoverEventCard
                    event={item}
                    badgeColors={badgeColors}
                    onPress={() => navigateToEvent(item)}
                  />
                )}
              />

              {/* Tendencias */}
              <DiscoverSection
                title="Tendencias"
                data={discover.trending}
                renderItem={({ item }) => (
                  <DiscoverEventCard
                    event={item}
                    badgeColors={badgeColors}
                    onPress={() => navigateToEvent(item)}
                  />
                )}
              />

              {/* Venues cerca de ti */}
              <DiscoverSection
                title="Venues cerca de ti"
                data={discover.nearbyVenues}
                renderItem={({ item }) => (
                  <DiscoverVenueCard
                    venue={item}
                    distanceKm={item.distanceKm}
                    onPress={() => navigateToVenue(item)}
                  />
                )}
              />

              {/* Para ti — authenticated only */}
              {isAuthenticated && discover.forYou?.length > 0 && (
                <DiscoverSection
                  title="Para ti"
                  data={discover.forYou}
                  renderItem={({ item }) => (
                    <DiscoverEventCard
                      event={item}
                      badgeColors={badgeColors}
                      onPress={() => navigateToEvent(item)}
                    />
                  )}
                />
              )}

              {/* Esta semana */}
              <DiscoverSection
                title="Esta semana"
                data={discover.thisWeek}
                renderItem={({ item }) => (
                  <DiscoverEventCard
                    event={item}
                    badgeColors={badgeColors}
                    onPress={() => navigateToEvent(item)}
                  />
                )}
              />

              {/* Categorías */}
              <Text style={styles.sectionTitle}>Categorías</Text>
              <CategoryGrid config={config} onCategoryPress={handleCategoryPress} />

              {/* Recomendado */}
              <Text style={styles.sectionTitle}>Recomendado</Text>
              <View style={styles.recommendContainer}>
                {recommended.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.recommendPill}
                    onPress={() => handleRecommendedPress(item)}
                  >
                    <Text style={styles.recommendText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Radius Modal */}
          <Modal
            visible={radiusModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setRadiusModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <GlassOverlay borderRadius={16} style={styles.modalContent}>
                <Text style={styles.modalTitle}>Filtros de Búsqueda</Text>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                <View style={styles.citySelectorWrapper}>
                  <TouchableOpacity
                    onPress={() => setShowCityDropdown(!showCityDropdown)}
                    style={styles.citySelectorButton}
                  >
                    <Text style={styles.citySelectorText}>{city || 'Santiago'}</Text>
                    {showCityDropdown ? (
                      <ChevronUp size={20} color={colors.text} />
                    ) : (
                      <ChevronDown size={20} color={colors.text} />
                    )}
                  </TouchableOpacity>

                  {showCityDropdown && (
                    <View style={styles.cityDropdown}>
                      {availableCities.map((cityOption) => (
                        <TouchableOpacity
                          key={cityOption}
                          onPress={() => {
                            setCity(cityOption);
                            setShowCityDropdown(false);
                          }}
                          style={[
                            styles.cityOption,
                            city === cityOption && styles.cityOptionSelected,
                          ]}
                        >
                          <Text style={styles.cityOptionText}>{cityOption}</Text>
                          {city === cityOption && <Check size={18} color={colors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <Text style={styles.sliderLabel}>Radio de Búsqueda: {radius} km</Text>
                <View style={{ paddingHorizontal: 10 }}>
                  <Slider
                    minimumValue={1}
                    maximumValue={50}
                    step={1}
                    value={radius}
                    onValueChange={setRadius}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.glassLight}
                    thumbTintColor={colors.primary}
                  />
                </View>

                {/* Venue Type Filter */}
                {config?.venue_types?.length > 0 && (
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Tipo de Venue</Text>
                    <View style={styles.filterPills}>
                      {config.venue_types.map((vt) => (
                        <TouchableOpacity
                          key={vt}
                          onPress={() => setSelectedVenueType(selectedVenueType === vt ? null : vt)}
                          style={[
                            styles.filterPill,
                            selectedVenueType === vt && styles.filterPillActive,
                          ]}
                        >
                          <Text style={[
                            styles.filterPillText,
                            selectedVenueType === vt && styles.filterPillTextActive,
                          ]}>{vt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Category Filter */}
                {config?.categories?.length > 0 && (
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Categoría</Text>
                    <View style={styles.filterPills}>
                      {config.categories.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                          style={[
                            styles.filterPill,
                            selectedCategory === cat && styles.filterPillActive,
                          ]}
                        >
                          <Text style={[
                            styles.filterPillText,
                            selectedCategory === cat && styles.filterPillTextActive,
                          ]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <Pressable
                  onPress={() => {
                    setShowCityDropdown(false);
                    setRadiusModalVisible(false);
                  }}
                  style={styles.okButtonWrapper}
                >
                  <LinearGradient
                    colors={[colors.authGradientStart, colors.authGradientEnd]}
                    style={styles.okButton}
                  >
                    <Text style={styles.okButtonText}>OK</Text>
                  </LinearGradient>
                </Pressable>
                </ScrollView>
              </GlassOverlay>
            </View>
          </Modal>

        </View>
      </ScrollView>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, position: 'relative' },
  scrollView: { flex: 1, paddingTop: 10 },
  content: { width: '100%', paddingBottom: 20 },

  // Explore button
  explorarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  explorarText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },

  // Search input
  searchWrapper: {
    position: 'relative',
    marginHorizontal: 20,
    marginBottom: 12,
    zIndex: 10,
  },
  searchGlass: { paddingHorizontal: 14, paddingVertical: 0 },
  searchInner: { flexDirection: 'row', alignItems: 'center' },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    paddingVertical: 12,
  },
  clearButton: { padding: 4, marginLeft: 6 },

  // Search results dropdown
  resultSection: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    zIndex: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    maxHeight: 280,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      android: { elevation: 8 },
      ios: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.35)' },
    }),
  },
  resultTitle: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultCard: {
    backgroundColor: colors.glassLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  resultName: { color: colors.text, fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  resultType: { color: colors.textDim, fontSize: 13, fontFamily: 'Outfit_400Regular', marginTop: 2 },

  // Section titles
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    marginLeft: 20,
    marginVertical: 10,
  },

  // Recommended pills
  recommendContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 20 },
  recommendPill: {
    backgroundColor: colors.glassLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginRight: 10,
    marginBottom: 10,
  },
  recommendText: { fontSize: 14, color: colors.text, fontFamily: 'Outfit_500Medium' },

  // Radius Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { padding: 20, width: '85%', maxHeight: '85%' },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  citySelectorWrapper: { position: 'relative', marginBottom: 20 },
  citySelectorButton: {
    backgroundColor: colors.glassLight,
    borderRadius: 8,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  citySelectorText: { color: colors.text, fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  cityDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.glassLight,
    borderRadius: 10,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 1000,
    ...Platform.select({
      android: { elevation: 10 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.3)' },
    }),
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  cityOptionSelected: { backgroundColor: colors.glassLight },
  cityOptionText: { color: colors.text, fontSize: 16, fontFamily: 'Outfit_500Medium' },
  sliderLabel: {
    color: colors.textDim,
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
    marginTop: 20,
  },
  okButtonWrapper: { marginTop: 20, alignSelf: 'center' },
  okButton: { paddingHorizontal: 32, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  okButtonText: { color: colors.text, fontSize: 16, fontFamily: 'Outfit_600SemiBold' },

  // Explore row with clear-filter button
  explorarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
    gap: 8,
  },
  clearFiltersButton: {
    backgroundColor: colors.glassLight,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  // Structured search results
  structuredResults: { marginHorizontal: 20, marginTop: 8 },
  structuredCard: { position: 'relative', marginBottom: 10 },

  // Modal filter pills
  filterSection: { marginTop: 20 },
  filterLabel: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  filterPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassLight,
  },
  filterPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '33',
  },
  filterPillText: { color: colors.textDim, fontSize: 13, fontFamily: 'Outfit_500Medium' },
  filterPillTextActive: { color: colors.primary },

  // Loading / Error
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  loadingText: { color: colors.textDim, fontSize: 14, fontFamily: 'Outfit_400Regular', marginTop: 8 },
  errorContainer: { padding: 20, alignItems: 'center' },
  errorText: { color: colors.text, fontSize: 15, fontFamily: 'Outfit_500Medium', textAlign: 'center', marginBottom: 12 },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
});
