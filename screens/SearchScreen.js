import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  KeyboardAvoidingView,
  Animated,
  Easing,
  Linking,
  Dimensions,
  Image,
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
  Sparkles,
} from 'lucide-react-native';
import { TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import { fetchAISearch } from '../services/search';
import { transformEvent, transformVenue } from '../services/transformers';
import { assignDateTags } from '../utils/filtering';
import { formatEventDateTime, getEventPriceLabel } from '../utils/mapHelpers';
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
  'Música':        { pillCategoryKey: 'Música' },
  'Jazz':          { pillCategoryKey: 'Jazz' },
  'Comedia':       { pillCategoryKey: 'Comedia' },
  'Nacional':      { pillCategoryKey: 'Nacional' },
  'Teatro':        { pillCategoryKey: 'Teatro' },
  'Vida Nocturna': { pillCategoryKey: 'Vida Nocturna' },
  'Barrios':       { pillCategoryKey: 'Barrios' },
  'Festivales':    { pillCategoryKey: 'Festivales' },
  'Cine':          { pillCategoryKey: 'Cine' },
  'Museos':        { pillCategoryKey: 'Museos' },
  'Al aire libre': { pillCategoryKey: 'Al aire libre' },
  'Sunsets':       { pillCategoryKey: 'Sunsets' },
  'Familiar':      { pillCategoryKey: 'Familiar' },
  'Ferias':        { pillCategoryKey: 'Ferias' },
};

const EviCharacter = () => (
  <Image
    source={{ uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEzMCIgdmlld0JveD0iMCAwIDM0MCA0MjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InBnIiBjeD0iMzglIiBjeT0iMzIlIiByPSI2MiUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjRDhCNEZFIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNjAlIiBzdG9wLWNvbG9yPSIjOTMzM0VBIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzZEMjhEOSIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICAgIDxyYWRpYWxHcmFkaWVudCBpZD0iZmciIGN4PSI0MiUiIGN5PSIzOCUiIHI9IjU4JSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGRkZGRkYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjRURFOUZFIi8+CiAgICA8L3JhZGlhbEdyYWRpZW50PgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJlZyIgY3g9IjMwJSIgY3k9IjI4JSIgcj0iNjUlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzVCMjFCNiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMxRTAwNTAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxlbGxpcHNlIGN4PSIxNzAiIGN5PSI0MDAiIHJ4PSI3NSIgcnk9IjE0IiBmaWxsPSIjQTg1NUY3IiBvcGFjaXR5PSIwLjI1Ii8+CiAgPHBhdGggZD0iTTE3MCAxOCBDODggMTggMzggODIgMzggMTYyIEMzOCAyNDIgMTE4IDMwOCAxNTIgMzM4IEMxNjIgMzQ4IDE3MCAzNTggMTcwIDM1OCBDMTcwIDM1OCAxNzggMzQ4IDE4OCAzMzggQzIyMiAzMDggMzAyIDI0MiAzMDIgMTYyIEMzMDIgODIgMjUyIDE4IDE3MCAxOCBaIiBmaWxsPSJ1cmwoI3BnKSIvPgogIDxwYXRoIGQ9Ik0xNzAgMTggQzEzMCAxOCAxMDAgMzIgMTAwIDMyIEMxMzAgMjQgMTUwIDIwIDE3MCAyMCBDMTkwIDIwIDIxMCAyNCAyNDAgMzIgQzI0MCAzMiAyMTAgMTggMTcwIDE4IFoiIGZpbGw9IiNFOUQ1RkYiIG9wYWNpdHk9IjAuMzUiLz4KICA8ZWxsaXBzZSBjeD0iMTcwIiBjeT0iMTYyIiByeD0iODUiIHJ5PSI4NSIgZmlsbD0idXJsKCNmZykiLz4KICA8ZWxsaXBzZSBjeD0iMTQyIiBjeT0iMTU1IiByeD0iMTkiIHJ5PSIyMiIgZmlsbD0idXJsKCNlZykiLz4KICA8ZWxsaXBzZSBjeD0iMTk4IiBjeT0iMTU1IiByeD0iMTkiIHJ5PSIyMiIgZmlsbD0idXJsKCNlZykiLz4KICA8ZWxsaXBzZSBjeD0iMTM2IiBjeT0iMTQ5IiByeD0iNyIgcnk9IjgiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjk1Ii8+CiAgPGVsbGlwc2UgY3g9IjE5MiIgY3k9IjE0OSIgcng9IjciIHJ5PSI4IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC45NSIvPgogIDxlbGxpcHNlIGN4PSIxMzMiIGN5PSIxNDYiIHJ4PSIzIiByeT0iMy41IiBmaWxsPSJ3aGl0ZSIvPgogIDxlbGxpcHNlIGN4PSIxODkiIGN5PSIxNDYiIHJ4PSIzIiByeT0iMy41IiBmaWxsPSJ3aGl0ZSIvPgogIDxwYXRoIGQ9Ik0xNTAgMTkyIFExNzAgMjEyIDE5MCAxOTIiIHN0cm9rZT0iIzdDM0FFRCIgc3Ryb2tlLXdpZHRoPSI0IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8ZWxsaXBzZSBjeD0iMTIyIiBjeT0iMTgyIiByeD0iMTMiIHJ5PSI5IiBmaWxsPSIjRkI3MTg1IiBvcGFjaXR5PSIwLjUiLz4KICA8ZWxsaXBzZSBjeD0iMjE4IiBjeT0iMTgyIiByeD0iMTMiIHJ5PSI5IiBmaWxsPSIjRkI3MTg1IiBvcGFjaXR5PSIwLjUiLz4KICA8ZWxsaXBzZSBjeD0iMTcwIiBjeT0iMTU1IiByeD0iODAiIHJ5PSI3OCIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuMDYiLz4KPC9zdmc+' }}
    style={{ width: 110, height: 130 }}
    resizeMode="contain"
  />
);

const AI_CHIPS = [
  '🎵 Jazz en vivo',
  '🎭 Teatro este finde',
  '👨‍👩‍👧 Salida familiar',
  '🌿 Aire libre gratis',
  '🎬 Cine + cena',
  '🎨 Exposición de arte',
];

function transformEventWithInlineVenue(apiEvent) {
  const venue = apiEvent.venue ? transformVenue(apiEvent.venue) : null;
  const venueMap = venue ? new Map([[venue.id, venue]]) : new Map();
  return transformEvent(apiEvent, venueMap);
}

export default function SearchScreen() {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [city, setCity] = useState('Santiago');
  const [radius, setRadius] = useState(10);
  const [radiusModalVisible, setRadiusModalVisible] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVenueType, setSelectedVenueType] = useState(null);

  // AI search state
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiResults, setAiResults] = useState([]);

  // Animations
  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const eviFloatAnim = useRef(new Animated.Value(0)).current;
  const eviScaleAnim = useRef(new Animated.Value(0.8)).current;
  const eviWiggleAnim = useRef(new Animated.Value(0)).current;
  const starAnim1 = useRef(new Animated.Value(0)).current;
  const starAnim2 = useRef(new Animated.Value(0)).current;
  const starAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateStar = (anim, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
        ])
      ).start();
    };
    animateStar(starAnim1, 0);
    animateStar(starAnim2, 400);
    animateStar(starAnim3, 800);
  }, []);

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, []);

  useEffect(() => {
    if (aiLoading) {
      const bounce = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
      bounce.start();
      return () => bounce.stop();
    } else {
      bounceAnim.setValue(0);
    }
  }, [aiLoading]);

  useEffect(() => {
    if (aiModalVisible) {
      eviScaleAnim.setValue(0.8);
      eviFloatAnim.setValue(0);
      const startEviFloat = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(eviFloatAnim, {
              toValue: -10,
              duration: 1800,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
            Animated.timing(eviFloatAnim, {
              toValue: 0,
              duration: 1800,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
          ])
        ).start();
      };
      Animated.spring(eviScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start(() => startEviFloat());
    } else {
      eviScaleAnim.setValue(0.8);
      eviFloatAnim.setValue(0);
    }
  }, [aiModalVisible]);

  useEffect(() => {
    if (aiLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(eviWiggleAnim, { toValue: -8, duration: 120, useNativeDriver: true }),
          Animated.timing(eviWiggleAnim, { toValue: 8, duration: 120, useNativeDriver: true }),
          Animated.timing(eviWiggleAnim, { toValue: -8, duration: 120, useNativeDriver: true }),
          Animated.timing(eviWiggleAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();
    } else {
      eviWiggleAnim.setValue(0);
    }
  }, [aiLoading]);

  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const { data: config } = useAppConfig();
  const badgeColors = getCategoryBadgeColors(config?.categories);
  const availableCities = config?.available_cities || ['Santiago'];

  const discoverLat = location?.coords?.latitude;
  const discoverLon = location?.coords?.longitude;

  const {
    data: discover,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useDiscover({
    lat: discoverLat,
    lon: discoverLon,
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
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) {
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setLocation({
            coords: { latitude: lat, longitude: lon },
          });
        },
        () => {},
        { timeout: 10000, maximumAge: 300000 }
      );
      return;
    }

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
      }
    })();
  }, []);

  const handleSearchChange = (text) => {
    setInputValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(text), 300);
  };

  // Normalize: lowercase + strip combining diacriticals (á→a, é→e, ñ→n, etc.)
  const normalizeStr = (s) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  // Free-text search against the full venues/events dataset.
  // Multi-strategy: token-order-independent + accent-insensitive + partial word.
  //
  // Scoring (per result):
  //   3 — all tokens match in the primary field (name / title)
  //   2 — all tokens match across combined fields
  //   1 — any token matches in the primary field
  //   0 — no match (excluded)
  const getFilteredResults = useCallback(() => {
    if (!searchQuery.trim()) return { events: [], venues: [] };

    const tokens = normalizeStr(searchQuery)
      .split(/\s+/)
      .filter(Boolean);

    const allIn = (text, toks) => toks.every((t) => text.includes(t));
    const anyIn = (text, toks) => toks.some((t) => text.includes(t));

    const scoreVenue = (v) => {
      const name = normalizeStr(v.name);
      const combined = `${name} ${normalizeStr(v.type)} ${normalizeStr(v.city)}`;
      if (allIn(name, tokens)) return 3;
      if (allIn(combined, tokens)) return 2;
      if (anyIn(name, tokens)) return 1;
      return 0;
    };

    const scoreEvent = (e) => {
      const title = normalizeStr(e.title);
      const combined = `${title} ${normalizeStr(e.location)}`;
      if (allIn(title, tokens)) return 3;
      if (allIn(combined, tokens)) return 2;
      if (anyIn(title, tokens)) return 1;
      return 0;
    };

    const matchedVenues = venues
      .map((v) => ({ v, score: scoreVenue(v) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ v }) => v);

    const matchedEvents = events
      .map((e) => ({ e, score: scoreEvent(e) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ e }) => e);

    return { events: matchedEvents, venues: matchedVenues };
  }, [searchQuery, events, venues]);

  const filtered = getFilteredResults();
  const showSearchLoading = inputValue.length > 0 && searchDataLoading;
  const showDropdown = inputValue.length > 0 && !searchDataLoading && (filtered.events.length > 0 || filtered.venues.length > 0);

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

  // All pills now navigate to CategoryScreen
  const CATEGORY_SCREEN_KEYS = new Set([
    'Jazz', 'Comedia', 'Teatro', 'Vida Nocturna',
    'Nacional', 'Barrios', 'Al aire libre', 'Festivales',
    'Museos', 'Cine',
    'Sunsets', 'Ferias', 'Familiar',
  ]);

  const handleCategoryPress = (categoryKey) => {
    const key = (categoryKey || '').trim();

    if (CATEGORY_SCREEN_KEYS.has(key)) {
      navigation.navigate('CategoryScreen', { categoryKey: key });
      return;
    }

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

  const handleAISearch = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiMessage('');
    setAiResults([]);
    try {
      const data = await fetchAISearch({ prompt: aiInput.trim(), limit: 8 });
      setAiMessage(data.message || '');
      const transformed = assignDateTags(
        (data.events || []).map(transformEventWithInlineVenue)
      );
      setAiResults(transformed);
    } catch (err) {
      console.error('[handleAISearch]', err?.message);
      setAiMessage('Algo salió mal. Intenta de nuevo.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiModalClose = () => {
    setAiModalVisible(false);
    setAiInput('');
    setAiMessage('');
    setAiResults([]);
    setAiLoading(false);
  };

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
                  value={inputValue}
                  onChangeText={handleSearchChange}
                />
                {inputValue.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => { setInputValue(''); setSearchQuery(''); }}
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
              {discover.nearbyVenues?.length > 0 ? (
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
              ) : (
                <View>
                  <Text style={styles.sectionTitle}>Venues cerca de ti</Text>
                  <Text style={styles.emptyNearby}>
                    Activa tu ubicación para ver venues cercanas a ti
                  </Text>
                </View>
              )}

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
                      {config.categories.map((cat) => {
                        const catName = typeof cat === 'object' ? cat.name : cat;
                        return (
                          <TouchableOpacity
                            key={catName}
                            onPress={() => setSelectedCategory(selectedCategory === catName ? null : catName)}
                            style={[
                              styles.filterPill,
                              selectedCategory === catName && styles.filterPillActive,
                            ]}
                          >
                            <Text style={[
                              styles.filterPillText,
                              selectedCategory === catName && styles.filterPillTextActive,
                            ]}>{catName}</Text>
                          </TouchableOpacity>
                        );
                      })}
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

      {/* AI Search FAB */}
      <View style={styles.fabWrapper}>
        <Animated.Text style={[styles.fabStar, styles.fabStar1, {
          opacity: starAnim1,
          transform: [{ scale: starAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
        }]}>✦</Animated.Text>
        <Animated.Text style={[styles.fabStar, styles.fabStar2, {
          opacity: starAnim2,
          transform: [{ scale: starAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
        }]}>✦</Animated.Text>
        <Animated.Text style={[styles.fabStar, styles.fabStar3, {
          opacity: starAnim3,
          transform: [{ scale: starAnim3.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
        }]}>✦</Animated.Text>
        <TouchableOpacity style={styles.fab} onPress={() => setAiModalVisible(true)} activeOpacity={0.85}>
          <LinearGradient
            colors={['#9333EA', '#5B21B6']}
            style={styles.fabGradient}
          >
            <Image
              source={{ uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDM0MCA0MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InBnIiBjeD0iNDAlIiBjeT0iMzUlIiByPSI2MCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjQzA4NEZDIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzdDM0FFRCIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICA8L2RlZnM+CiAgPGVsbGlwc2UgY3g9IjE3MCIgY3k9IjM3NSIgcng9IjYwIiByeT0iMTIiIGZpbGw9IiNDMDg0RkMiIG9wYWNpdHk9IjAuMyIvPgogIDxwYXRoIGQ9Ik0xNzAgMjAgQzk1IDIwIDQ1IDgwIDQ1IDE1NSBDNDUgMjMwIDExNSAyOTUgMTQ4IDMyNSBDMTU4IDMzNSAxNzAgMzQ1IDE3MCAzNDUgQzE3MCAzNDUgMTgyIDMzNSAxOTIgMzI1IEMyMjUgMjk1IDI5NSAyMzAgMjk1IDE1NSBDMjk1IDgwIDI0NSAyMCAxNzAgMjAgWiIgZmlsbD0idXJsKCNwZykiLz4KICA8ZWxsaXBzZSBjeD0iMTcwIiBjeT0iMTU4IiByeD0iNzgiIHJ5PSI3OCIgZmlsbD0id2hpdGUiLz4KICA8ZWxsaXBzZSBjeD0iMTQ4IiBjeT0iMTUyIiByeD0iMTYiIHJ5PSIxOCIgZmlsbD0iIzRDMUQ5NSIvPgogIDxlbGxpcHNlIGN4PSIxOTIiIGN5PSIxNTIiIHJ4PSIxNiIgcnk9IjE4IiBmaWxsPSIjNEMxRDk1Ii8+CiAgPGVsbGlwc2UgY3g9IjE0MyIgY3k9IjE0NyIgcng9IjYiIHJ5PSI3IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC45Ii8+CiAgPGVsbGlwc2UgY3g9IjE4NyIgY3k9IjE0NyIgcng9IjYiIHJ5PSI3IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC45Ii8+CiAgPHBhdGggZD0iTTE1NSAxODAgUTE3MCAxOTYgMTg1IDE4MCIgc3Ryb2tlPSIjN0MzQUVEIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxlbGxpcHNlIGN4PSIxMzIiIGN5PSIxNzUiIHJ4PSIxMCIgcnk9IjciIGZpbGw9IiNGREE0QUYiIG9wYWNpdHk9IjAuNTUiLz4KICA8ZWxsaXBzZSBjeD0iMjA4IiBjeT0iMTc1IiByeD0iMTAiIHJ5PSI3IiBmaWxsPSIjRkRBNEFGIiBvcGFjaXR5PSIwLjU1Ii8+Cjwvc3ZnPg==' }}
              style={{ width: 36, height: 44 }}
              resizeMode="contain"
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* AI Search Modal */}
      <Modal
        visible={aiModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleAiModalClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.aiSheet}
        >
            {/* Handle bar */}
            <View style={styles.aiHandle} />

            {/* Close button */}
            <TouchableOpacity onPress={handleAiModalClose} style={styles.aiCloseBtn}>
              <X size={20} color={colors.textDim} />
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            >
              {/* Evi Header */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                <Animated.View style={{
                  alignItems: 'center',
                  transform: [
                    { translateY: eviFloatAnim },
                    { translateX: eviWiggleAnim },
                    { scale: eviScaleAnim },
                  ],
                }}>
                  <EviCharacter />
                </Animated.View>
                <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 18, color: colors.primary, marginTop: 8 }}>
                  Hola, soy Evi ✨
                </Text>
                <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 13, color: colors.textDim, marginTop: 4 }}>
                  ¿Qué plan tienes en mente?
                </Text>
              </View>

              {/* Input */}
              <TextInput
                style={styles.aiInput}
                multiline
                placeholder="Ej: una cita romántica para escuchar jazz esta noche..."
                placeholderTextColor={colors.textDim}
                value={aiInput}
                onChangeText={setAiInput}
                autoFocus
                textContentType="none"
                autoComplete="off"
                importantForAutofill="no"
                keyboardType="default"
              />

              {/* Suggestion chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsContent}
              >
                {AI_CHIPS.map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={styles.chip}
                    onPress={() => setAiInput(chip)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Send button OR Evi loading state */}
              {aiLoading ? (
                <View style={styles.eviLoading}>
                  <Animated.Text style={[styles.eviLoadingEmoji, { transform: [{ translateY: bounceAnim }] }]}>
                    📍
                  </Animated.Text>
                  <Text style={styles.eviLoadingText}>Evi está buscando tu plan perfecto...</Text>
                </View>
              ) : (
                <Pressable
                  onPress={handleAISearch}
                  disabled={!aiInput.trim()}
                  style={{ opacity: !aiInput.trim() ? 0.5 : 1 }}
                >
                  <LinearGradient
                    colors={[colors.authGradientStart, colors.authGradientEnd]}
                    style={styles.aiSendButton}
                  >
                    <Text style={styles.aiSendText}>Buscar con Evi 📍</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {/* Results panorama */}
              {!!aiMessage && (
                <>
                  <View style={styles.aiMessageBlock}>
                    <Text style={styles.aiMessageText}>📍 {aiMessage}</Text>
                    {aiResults.length > 0 && (
                      <Text style={styles.aiPlanLabel}>Tu plan incluye:</Text>
                    )}
                  </View>

                  {aiResults.map((event, idx) => (
                    <View key={event.id ?? idx}>
                      <TouchableOpacity
                        style={styles.aiResultCard}
                        activeOpacity={0.85}
                        onPress={() => { handleAiModalClose(); navigateToEvent(event); }}
                      >
                        {!!event.category && (
                          <View style={[styles.aiResultBadge, { backgroundColor: badgeColors[event.category] || 'rgba(159,123,255,0.2)' }]}>
                            <Text style={styles.aiResultBadgeText}>{event.category}</Text>
                          </View>
                        )}
                        <Text style={styles.aiResultTitle} numberOfLines={2}>{event.title}</Text>
                        <Text style={styles.aiResultMeta}>{formatEventDateTime(event)}</Text>
                        {!!event.location && (
                          <Text style={styles.aiResultMeta} numberOfLines={1}>{event.location}</Text>
                        )}
                        {!!getEventPriceLabel(event) && (
                          <Text style={styles.aiResultPrice}>{getEventPriceLabel(event)}</Text>
                        )}
                        <TouchableOpacity
                          style={styles.aiMapsRow}
                          onPress={() => Linking.openURL(
                            `https://maps.google.com/?q=${encodeURIComponent((event.venueName || event.location || '') + ' Santiago')}`
                          )}
                        >
                          <Text style={styles.aiMapsText}>📍 Cómo llegar</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                      {idx < aiResults.length - 1 && <View style={styles.aiResultDivider} />}
                    </View>
                  ))}

                  {/* Budget summary */}
                  {aiResults.length > 0 && (
                    <View style={styles.aiBudget}>
                      <Text style={styles.aiBudgetTitle}>💰 Presupuesto estimado</Text>
                      <Text style={styles.aiBudgetAmount}>
                        {(() => {
                          const total = aiResults.reduce((s, e) => s + (e.price || 0), 0);
                          return total > 0
                            ? `Desde $${total.toLocaleString('es-CL')} por persona`
                            : 'Entrada liberada';
                        })()}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

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

  emptyNearby: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    marginHorizontal: 20,
    marginBottom: 16,
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

  // AI FAB
  fabWrapper: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + 32,
    left: 20,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.6)',
    elevation: 10,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 },
      web: { boxShadow: `0 4px 20px ${colors.primary}66` },
    }),
  },
  fabStar: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  fabStar1: {
    top: 2,
    right: 4,
  },
  fabStar2: {
    top: 6,
    left: 2,
  },
  fabStar3: {
    bottom: 4,
    right: 2,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // AI Modal sheet (pageSheet — no overlay needed)
  aiSheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  aiHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorder,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  aiCloseBtn: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 4,
  },
  aiScrollContent: {
    paddingBottom: 32,
  },

  // Evi header
  eviHeader: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  eviEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  eviName: {
    color: colors.primary,
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 6,
  },
  eviSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eviSubtitle: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  eviCursor: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    marginLeft: 1,
  },

  // Input + chips
  aiInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  chipsScroll: { marginBottom: 16 },
  chipsContent: { gap: 8, paddingRight: 4 },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.textDim,
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },

  // Send button
  aiSendButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  aiSendText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Evi loading state
  eviLoading: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  eviLoadingEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  eviLoadingText: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },

  // AI message block
  aiMessageBlock: {
    backgroundColor: 'rgba(191,160,255,0.08)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  aiMessageText: {
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    lineHeight: 22,
  },
  aiPlanLabel: {
    color: colors.primary,
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 10,
  },

  // Result cards (vertical list)
  aiResultCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
  },
  aiResultBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  aiResultBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  aiResultTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 6,
    lineHeight: 22,
  },
  aiResultMeta: {
    color: colors.textDim,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 3,
  },
  aiResultPrice: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 4,
  },
  aiMapsRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  aiMapsText: {
    color: colors.accent,
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  aiResultDivider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: 10,
  },

  // Budget summary
  aiBudget: {
    marginTop: 16,
    backgroundColor: 'rgba(191,160,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
  },
  aiBudgetTitle: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 4,
  },
  aiBudgetAmount: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
});
