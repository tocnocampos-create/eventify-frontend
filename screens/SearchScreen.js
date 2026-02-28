import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  Modal,
  Pressable,
  ActivityIndicator,
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
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Compass,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import dayjs from 'dayjs';
import { useVenues, useEvents } from '../hooks/useMapData';
import Slider from '@react-native-community/slider';
import GooglePlacesInput from '../components/GooglePlacesInput';
import colors from '../theme/colors';
import { formatEventDateTime } from '../utils/mapHelpers';
import { categoryColors } from '../utils/pinColors';
import { normalizeCategory } from '../utils/filters.schema';

const badgeColors = {
  'Música': colors.badgeMusica,
  'Teatro': colors.badgeTeatro,
  'Comedia': colors.badgeComedia,
  'Arte': colors.badgeArte,
  'Cine': colors.badgeCine,
};

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState(null);
  const [city, setCity] = useState('Santiago');
  const [selectedCity, setSelectedCity] = useState('Santiago');
  const [selectedComuna, setSelectedComuna] = useState('');
  const [radius, setRadius] = useState(50);
  const [radiusModalVisible, setRadiusModalVisible] = useState(false);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState(null);
  const [placesInputValue, setPlacesInputValue] = useState('');
  const placesInputRef = useRef(null);
  const lastSelectedPlace = useRef(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const navigation = useNavigation();

  const { data: venuesData, isLoading: venuesLoading } = useVenues();
  const { data: eventsData, isLoading: eventsLoading } = useEvents(venuesData);
  const allVenues = venuesData || [];
  const allEvents = eventsData || [];
  const isLoading = venuesLoading || eventsLoading;

  // Available cities (ready to expand)
  const availableCities = ['Santiago'];

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermissionStatus(status);
        if (status !== 'granted') return;

        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
        let geo = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        // Only set city if it's in the available cities list
        const detectedCity = geo[0]?.city || geo[0]?.subAdministrativeArea;
        if (detectedCity && availableCities.includes(detectedCity)) {
          setCity(detectedCity);
          setSelectedCity(detectedCity);
        }
        // Otherwise, keep default 'Santiago'
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationPermissionStatus('denied');
      }
    })();
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredVenues([]);
      setFilteredEvents([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const todayStart = dayjs().startOf('day');
    setFilteredVenues(
      allVenues.filter((v) =>
        (v.name || '').toLowerCase().includes(q) ||
        (v.type || '').toLowerCase().includes(q) ||
        (v.city || '').toLowerCase().includes(q)
      )
    );
    setFilteredEvents(
      allEvents.filter((e) => {
        const matchesQuery =
          (e.title || '').toLowerCase().includes(q) ||
          (e.location || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
        const eventDate = dayjs(e?.date);
        if (!eventDate.isValid()) return false;
        return eventDate.isSame(todayStart, 'day') || eventDate.isAfter(todayStart, 'day') || eventDate.isAfter(todayStart);
      })
    );
  }, [searchQuery, allVenues, allEvents]);

  const trendingEvents = useMemo(() => allEvents.filter(e => {
    const todayStart = dayjs().startOf('day');
    const eventDate = dayjs(e.date).startOf('day');
    const selectedDay = dayjs(selectedDate).startOf('day');
    if (!eventDate.isValid()) return false;
    const isNotPast = eventDate.isSame(todayStart, 'day') || eventDate.isAfter(todayStart, 'day') || eventDate.isAfter(todayStart);
    return eventDate.isSame(selectedDay) && isNotPast;
  }), [allEvents, selectedDate]);

  // === Categories con imágenes (agregadas Ecofriendly y Festivals) ===
  const categoryItems = [
    { key: 'Jazz', image: require('../assets/categories/jazz.png') },
    { key: 'Comedia', image: require('../assets/categories/comedy.png') },
    { key: 'Nacional', image: require('../assets/categories/nacional.png') },
    { key: 'Teatro', image: require('../assets/categories/theater.png') },
    { key: 'Vida Nocturna', image: require('../assets/categories/nightlife.png') },
    { key: 'Galerías ', image: require('../assets/categories/art.png') },
    { key: 'Barrios', image: require('../assets/categories/barrios.png') },
    { key: 'Festivales', image: require('../assets/categories/festivals.png') },
    { key: 'Cine', image: require('../assets/categories/cinema.png') },
    { key: 'Museos', image: require('../assets/categories/museos.png') },
    { key: 'Al aire libre', image: require('../assets/categories/ecofriendly.png') },
    { key: 'Sunsets', image: require('../assets/categories/sunsets.png') },
    { key: 'Familiar', image: require('../assets/categories/familiar.png') },
    { key: 'Ferias', image: require('../assets/categories/ferias.png') },
    { key: 'City Tour', image: require('../assets/categories/ciudad.png') },
  ];

  // Helper: agrupa en pares para apilar de a dos
  const chunkInPairs = (arr) => {
    const out = [];
    for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
    return out;
  };

  const recommended = [
    'Salas de Concierto',
    'Museos en un día',
    'Barrio Italia',
    'Imperdibles de la ciudad',
    'Ruta patrimonial',
    'Eventos gratuitos',
    'Mercado París-Londres',
  ];

  const getImageSource = (img) => {
    if (typeof img === 'number') return img;
    if (typeof img === 'string' && /^https?:\/\//i.test(img)) return { uri: img };
    return null;
  };

  return (
    <TabScreenLayout style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>

          {/* Explore Button */}
          <TouchableOpacity
            onPress={() => setRadiusModalVisible(true)}
            activeOpacity={0.8}
          >
            <GlassOverlay borderRadius={12} style={styles.explorarButton}>
              <Compass size={18} color={colors.primary} />
              <Text style={styles.explorarText}>
                Explorar: {city || 'Santiago'} ({radius} km)
              </Text>
              <SlidersHorizontal size={16} color={colors.textDim} />
            </GlassOverlay>
          </TouchableOpacity>

          {/* Date Navigation */}
          <View style={styles.scheduleRow}>
            <TouchableOpacity
              onPress={() => setSelectedDate(dayjs(selectedDate).subtract(1, 'day').toDate())}
              style={styles.arrowButton}
            >
              <ChevronLeft size={22} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.datePill}
            >
              <Calendar size={15} color={colors.primary} />
              <Text style={styles.scheduleText}>{dayjs(selectedDate).format('D MMMM')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedDate(dayjs(selectedDate).add(1, 'day').toDate())}
              style={styles.arrowButton}
            >
              <ChevronRight size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            date={selectedDate}
            onConfirm={(date) => {
              setSelectedDate(date);
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />

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

            {/* Search Results Dropdown */}
            {searchQuery.length > 0 && (filteredVenues.length > 0 || filteredEvents.length > 0) && (
              <View style={styles.resultSection}>
                <ScrollView>
                  {filteredEvents.length > 0 && (
                    <View>
                      <Text style={styles.resultTitle}>Próximos Eventos</Text>
                      {filteredEvents.map((e, i) => (
                        <TouchableOpacity
                          key={`ev-${i}`}
                          style={styles.resultCard}
                          onPress={() => navigation.navigate('EventDetail', { event: e })}
                        >
                          <Text style={styles.resultName}>{e.title}</Text>
                          <Text style={styles.resultType}>{e.location}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {filteredVenues.length > 0 && (
                    <View>
                      <Text style={styles.resultTitle}>Venues</Text>
                      {filteredVenues.map((v, i) => (
                        <TouchableOpacity
                          key={`venue-${i}`}
                          style={styles.resultCard}
                          onPress={() => navigation.navigate('VenueScreen', {
                            venueId: v.id,
                            venueName: v.name,
                            venueType: v.type,
                            venueCity: v.city,
                            coverImage: v.coverImage,
                            profileImage: v.profileImage,
                            menuPdfUrl: v.menuPdfUrl,
                          })}
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

          {/* Trending Events */}
          <Text style={styles.sectionTitle}>Tendencias en {city}</Text>
          <FlatList
            horizontal
            data={trendingEvents}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={true}
            renderItem={({ item }) => {
              const category = normalizeCategory(item?.category);
              const catColor = categoryColors[category] || colors.primary;
              const badgeBg = badgeColors[category] || 'rgba(159, 123, 255, 0.2)';

              return (
                <TouchableOpacity
                  style={styles.trendingCard}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('EventDetail', { event: item })}
                >
                  <View style={styles.trendingImageContainer}>
                    <Image source={{ uri: item.image }} style={styles.trendingImage} />
                    <LinearGradient
                      colors={['transparent', 'rgba(15, 5, 35, 0.85)']}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View style={[styles.trendingBadge, { backgroundColor: badgeBg }]}>
                      <Text style={styles.trendingBadgeText}>{category}</Text>
                    </View>
                  </View>
                  <View style={styles.trendingInfo}>
                    <Text style={styles.trendingTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.metaRow}>
                      <Calendar size={13} color={colors.textDim} />
                      <Text style={styles.metaText}>{formatEventDateTime(item)}</Text>
                    </View>
                    {!!item.location && (
                      <View style={styles.metaRow}>
                        <MapPin size={13} color={colors.textDim} />
                        <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
                      </View>
                    )}
                    {(item.price != null) && (
                      <Text style={styles.trendingPrice}>Desde ${item.price}</Text>
                    )}
                  </View>
                  <LinearGradient
                    colors={[catColor, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bottomAccent}
                  />
                </TouchableOpacity>
              );
            }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />

          {/* Venues */}
          {city && (
            <>
              <Text style={styles.sectionTitle}>Venues en {city}</Text>
              <FlatList
                horizontal
                data={allVenues.filter((v) => v.city === city)}
                keyExtractor={(item, index) => index.toString()}
                scrollEnabled={true}
                renderItem={({ item }) => {
                  const profileImage = getImageSource(item.profileImage) || require('../assets/venue-default-profile.png');
                  return (
                    <TouchableOpacity
                      style={styles.venueHorizontalCard}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('VenueScreen', {
                        venueId: item.id,
                        venueName: item.name,
                        venueType: item.type,
                        venueCity: item.city,
                        coverImage: item.coverImage,
                        profileImage: item.profileImage,
                        menuPdfUrl: item.menuPdfUrl,
                      })}
                    >
                      <View style={styles.venueImageRing}>
                        <Image source={profileImage} style={styles.venueImageHorizontal} />
                      </View>
                      <Text style={styles.venueHorizontalName}>{item.name}</Text>
                      <Text style={styles.venueHorizontalType}>{item.type}</Text>
                    </TouchableOpacity>
                  );
                }}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              />
            </>
          )}

          {/* Categories */}
          <Text style={styles.sectionTitle}>Categorías</Text>
          <FlatList
            data={chunkInPairs(categoryItems)}
            keyExtractor={(_, idx) => `col-${idx}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesListContent}
            scrollEnabled={true}
            renderItem={({ item: pair }) => (
              <View style={styles.categoryColumn}>
                {pair.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    activeOpacity={0.85}
                    style={styles.categoryCardWrapper}
                  >
                    <View style={styles.categoryCard}>
                      <Image source={cat.image} style={styles.categoryImage} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.65)']}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <Text style={styles.categoryLabel}>{cat.key}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {pair.length === 1 && <View style={[styles.categoryCardWrapper, { opacity: 0 }]} />}
              </View>
            )}
          />

          {/* Recommended */}
          <Text style={styles.sectionTitle}>Recomendado</Text>
          <View style={styles.recommendContainer}>
            {recommended.map((item, i) => (
              <TouchableOpacity key={i} style={styles.recommendPill}>
                <Text style={styles.recommendText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Radius Modal */}
          <Modal
            visible={radiusModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setRadiusModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <GlassOverlay borderRadius={16} style={styles.modalContent}>
                <Text style={styles.modalTitle}>Ubicación y Radio</Text>

                {/* City Selector */}
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

                  {/* City Dropdown */}
                  {showCityDropdown && (
                    <View style={styles.cityDropdown}>
                      {availableCities.map((cityOption) => (
                        <TouchableOpacity
                          key={cityOption}
                          onPress={() => {
                            setCity(cityOption);
                            setSelectedCity(cityOption);
                            setShowCityDropdown(false);
                          }}
                          style={[
                            styles.cityOption,
                            city === cityOption && styles.cityOptionSelected
                          ]}
                        >
                          <Text style={styles.cityOptionText}>{cityOption}</Text>
                          {city === cityOption && (
                            <Check size={18} color={colors.primary} />
                          )}
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
  content: { width: '100%', maxWidth: 1200, alignSelf: 'center' },

  // Explore button
  explorarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'center',
    gap: 8,
    marginBottom: 10,
  },
  explorarText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },

  // Date navigation
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  arrowButton: {
    padding: 6,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.glassLight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scheduleText: {
    color: colors.textDim,
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
  },

  // Search input
  searchWrapper: {
    position: 'relative',
    marginHorizontal: 20,
    marginBottom: 20,
    zIndex: 10,
  },
  searchGlass: {
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
    marginLeft: 6,
  },

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
  resultName: {
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  resultType: {
    color: colors.textDim,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },

  // Section titles
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    marginLeft: 20,
    marginVertical: 10,
  },

  // Trending event cards
  trendingCard: {
    width: 220,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(28, 10, 62, 0.82)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.35)' },
    }),
  },
  trendingImageContainer: {
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: 120,
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendingBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  trendingInfo: {
    padding: 10,
  },
  trendingTitle: {
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
  },
  trendingPrice: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 6,
  },
  bottomAccent: {
    height: 2,
  },

  // Venue cards
  venueHorizontalCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 12,
    paddingTop: 14,
    paddingHorizontal: 10,
    paddingBottom: 10,
    alignItems: 'center',
    backgroundColor: colors.glassLight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6 },
      android: { elevation: 4 },
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.25)' },
    }),
  },
  venueImageRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  venueImageHorizontal: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  venueHorizontalName: {
    color: colors.text,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
  venueHorizontalType: {
    color: colors.textDim,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },

  // Categories
  categoriesListContent: { paddingLeft: 20, paddingRight: 12 },
  categoryColumn: { marginRight: 10, justifyContent: 'space-between' },
  categoryCardWrapper: { marginBottom: 10 },
  categoryCard: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  categoryImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  categoryLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    color: colors.text,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
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
  recommendText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Outfit_500Medium',
  },

  // Radius Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  citySelectorWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
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
  citySelectorText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
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
  cityOptionSelected: {
    backgroundColor: colors.glassLight,
  },
  cityOptionText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
  },
  sliderLabel: {
    color: colors.textDim,
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
    marginTop: 20,
  },
  okButtonWrapper: {
    marginTop: 20,
    alignSelf: 'center',
  },
  okButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  okButtonText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Loading
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  loadingText: { color: colors.textDim, fontSize: 14, fontFamily: 'Outfit_400Regular', marginTop: 8 },
});
