import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
} from 'react-native';
import TabScreenLayout from '../components/TabScreenLayout';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import dayjs from 'dayjs';
import venues from '../data/venues';
import events from '../data/events';
import Slider from '@react-native-community/slider';
import GooglePlacesInput from '../components/GooglePlacesInput';

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
      venues.filter((v) =>
        v.name.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q)
      )
    );
    setFilteredEvents(
      events.filter((e) => {
        // Filter by search query
        const matchesQuery = e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q);
        if (!matchesQuery) return false;
        // Filter out past events - only show upcoming events
        const eventDate = dayjs(e?.date);
        if (!eventDate.isValid()) return false;
        return eventDate.isSame(todayStart, 'day') || eventDate.isAfter(todayStart, 'day') || eventDate.isAfter(todayStart);
      })
    );
  }, [searchQuery]);

  const trendingEvents = events.filter(e => {
    const todayStart = dayjs().startOf('day');
    const eventDate = dayjs(e.date).startOf('day');
    const selectedDay = dayjs(selectedDate).startOf('day');
    // Only show events that match the selected day AND are not in the past
    if (!eventDate.isValid()) return false;
    const isNotPast = eventDate.isSame(todayStart, 'day') || eventDate.isAfter(todayStart, 'day') || eventDate.isAfter(todayStart);
    return eventDate.isSame(selectedDay) && isNotPast;
  });

  // Format date/time same as HomeScreen carousel
  const formatEventDateTime = (e) => {
    const d = e?.date ? dayjs(e.date) : null;
    if (!d || !d.isValid()) return '';
    const datePart = d.format('DD MMM YYYY'); // ej: 23 oct 2025
    const timePart = e?.timeStart ? e.timeStart : null;
    return timePart ? `${datePart} · ${timePart}` : datePart;
  };

  // === Categories con imágenes (agregadas Ecofriendly y Festivals) ===
  const categoryItems = [
    { key: 'Jazz', image: require('../assets/categories/jazz.png') },
    { key: 'Comedia', image: require('../assets/categories/comedy.png') },
    { key: 'Nacional', image: require('../assets/categories/nacional.png') },
    { key: 'Teatro', image: require('../assets/categories/theater.png') },
    { key: 'Vida Nocturna', image: require('../assets/categories/nightlife.png') },
    { key: 'Galerías ', image: require('../assets/categories/art.png') },
    { key: 'Barrios', image: require('../assets/categories/barrios.png') }, // NUEVA
    { key: 'Festivales', image: require('../assets/categories/festivals.png') }, 
    { key: 'Cine', image: require('../assets/categories/cinema.png') }, 
    { key: 'Museos', image: require('../assets/categories/museos.png') },
    { key: 'Al aire libre', image: require('../assets/categories/ecofriendly.png') },
    { key: 'Sunsets', image: require('../assets/categories/sunsets.png') }, 
    { key: 'Familiar', image: require('../assets/categories/familiar.png') },
    { key: 'Ferias', image: require('../assets/categories/ferias.png') },
    { key: 'City Tour', image: require('../assets/categories/ciudad.png') },
      // NUEVA
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

  // 🔧 NUEVO: soporta require(...) (número) o URL remota
  const getImageSource = (img) => {
    if (typeof img === 'number') return img; // asset local con require(...)
    if (typeof img === 'string' && /^https?:\/\//i.test(img)) return { uri: img }; // URL remota
    return null; // fallback
  };

  return (
    <TabScreenLayout style={styles.container}>
      <ScrollView
        style={styles.scrollView}
      >
        <View style={styles.content}>
      <TouchableOpacity 
        onPress={() => setRadiusModalVisible(true)}
        style={styles.explorarButton}
      >
        <Text style={styles.title}>
          Explorar: {city || 'Santiago'} ({radius} km)
        </Text>
      </TouchableOpacity>

      <View style={styles.scheduleRow}>
        <TouchableOpacity 
          onPress={() => setSelectedDate(dayjs(selectedDate).subtract(1, 'day').toDate())}
        >
          <Text style={styles.arrow}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.scheduleText}>{dayjs(selectedDate).format('D MMMM')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setSelectedDate(dayjs(selectedDate).add(1, 'day').toDate())}
        >
          <Text style={styles.arrow}>›</Text>
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

      <TextInput
        style={styles.searchInput}
        placeholder="Eventos, venues o artistas"
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {searchQuery.length > 0 && (filteredVenues.length > 0 || filteredEvents.length > 0) && (
        <View style={styles.resultSection}>
          {filteredEvents.length > 0 && (
            <View>
              <Text style={styles.resultTitle}>Próximos Eventos</Text>
              {filteredEvents.map((e, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.venueCard}
                  onPress={() => navigation.navigate('EventDetail', { event: e })}
                >
                  <Text style={styles.venueName}>{e.title}</Text>
                  <Text style={styles.venueType}>{e.location}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {filteredVenues.length > 0 && (
            <View>
              <Text style={styles.resultTitle}>Venues</Text>
              {filteredVenues.map((v, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.venueCard}
                  onPress={() => navigation.navigate('VenueScreen', {
                    venueName: v.name,
                    venueType: v.type,
                    venueCity: v.city,
                    coverImage: v.coverImage,
                    profileImage: v.profileImage,
                    menuPdfUrl: v.menuPdfUrl,
                  })}
                >
                  <Text style={styles.venueName}>{v.name}</Text>
                  <Text style={styles.venueType}>{v.type} · {v.city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>Tendencias en {city}</Text>
      <FlatList
        horizontal
        data={trendingEvents}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={true}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.trendingCard}
            onPress={() => navigation.navigate('EventDetail', { event: item })}
          >
            <Image source={{ uri: item.image }} style={styles.trendingImageSmall} />
            <View style={styles.trendingTextContainerSmall}>
              <Text style={styles.trendingTitle}>{item.title}</Text>
              <Text style={styles.trendingDate}>{formatEventDateTime(item)}</Text>
              <Text style={styles.trendingLocation}>{item.location}</Text>
              <Text style={styles.trendingPrice}>{item.price ? `Desde $${item.price}` : 'Desde $25.000'}</Text>
            </View>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      />

      {city && (
        <>
          <Text style={styles.sectionTitle}>Venues en {city}</Text>
          <FlatList
            horizontal
            data={venues.filter((v) => v.city === city)}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={true}
            renderItem={({ item }) => {
              const profileImage = item.profileImage || require('../assets/venue-default-profile.png');
              return (
                <TouchableOpacity
                  style={styles.venueHorizontalCard}
                  onPress={() => navigation.navigate('VenueScreen', {
                    venueName: item.name,
                    venueType: item.type,
                    venueCity: item.city,
                    coverImage: item.coverImage,
                    profileImage: item.profileImage,
                    menuPdfUrl: item.menuPdfUrl,
                  })}
                >
                  <Image source={profileImage} style={styles.venueImageHorizontal} />
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

      <Text style={styles.sectionTitle}>Categorías</Text>
      {/* Carrusel horizontal con columnas de dos tarjetas */}
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
                  <View style={styles.categoryOverlay} />
                  <Text style={styles.categoryLabel}>{cat.key}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {pair.length === 1 && <View style={[styles.categoryCardWrapper, { opacity: 0 }]} />}
          </View>
        )}
      />

      <Text style={styles.sectionTitle}>Recomendado</Text>
      <View style={styles.recommendContainer}>
        {recommended.map((item, i) => (
          <TouchableOpacity 
            key={i} 
            style={styles.recommendPill}
          >
            <Text style={styles.recommendText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={radiusModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRadiusModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ubicación y Radio</Text>

            {/* City Selector */}
            <View style={styles.citySelectorWrapper}>
              <TouchableOpacity 
                onPress={() => setShowCityDropdown(!showCityDropdown)}
                style={styles.citySelectorButton}
              >
                <Text style={styles.citySelectorText}>{city || 'Santiago'}</Text>
                <Ionicons 
                  name={showCityDropdown ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#fff" 
                />
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
                        <Ionicons name="checkmark" size={18} color="#6A39FF" />
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
                minimumTrackTintColor="#6A39FF"
                maximumTrackTintColor="#ccc"
                thumbTintColor="#6A39FF"
              />
            </View>

            <Pressable
              onPress={() => {
                setShowCityDropdown(false);
                setRadiusModalVisible(false);
              }}
              style={{ marginTop: 20, alignSelf: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 16 }}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
        </View>
      </ScrollView>
    </TabScreenLayout>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C003D', position: 'relative' },
  scrollView: { flex: 1, paddingTop: 10 },
  content: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
  explorarButton: {
    backgroundColor: '#2C005F',
    borderRadius: 10,
    borderColor: '#6A39FF',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  citySelectorWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  citySelector: {
    backgroundColor: '#2C005F',
    borderRadius: 10,
    borderColor: '#6A39FF',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 180,
  },
  citySelectorButton: {
    backgroundColor: '#3E2670',
    borderRadius: 8,
    borderColor: '#6A39FF',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  citySelectorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cityText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  radiusButton: {
    backgroundColor: '#2C005F',
    borderRadius: 10,
    borderColor: '#6A39FF',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  radiusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cityDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#2C005F',
    borderRadius: 10,
    borderColor: '#6A39FF',
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3E2670',
  },
  cityOptionSelected: {
    backgroundColor: '#3E2670',
  },
  cityOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  arrow: {
    fontSize: 24,
    color: '#fff',
    paddingHorizontal: 12,
  },

  scheduleBox: { alignItems: 'center', marginBottom: 10 },
  scheduleText: { color: '#ccc', fontSize: 16 },
  searchInput: {
    backgroundColor: '#2C005F',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderColor: '#6A39FF',
    borderWidth: 1,
  },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 20, marginVertical: 10 },
  trendingCard: {
    width: 220,
    marginRight: 12,
    backgroundColor: '#3E2670',
    borderRadius: 12,
    overflow: 'hidden'
  },
  trendingImageSmall: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  trendingTextContainerSmall: {
    padding: 10,
  },
  venueHorizontalCard: {
    width: 140,
    backgroundColor: '#3E2670',
    marginRight: 12,
    borderRadius: 10,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 0,
    alignItems: 'center',
  },
  venueImageHorizontal: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 2,
  },
  venueHorizontalName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center'
  },
  venueHorizontalType: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center'
  },
  locationButton: {
    backgroundColor: '#3E2670',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  locationText: {
    color: '#fff',
    fontSize: 14,
  },
  locationHint: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sliderLabel: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  trendingTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  trendingDate: { color: '#ccc', fontSize: 14, marginTop: 2 },
  trendingLocation: { color: '#ccc', fontSize: 13 },
  trendingPrice: { color: '#fff', fontSize: 14, marginTop: 4 },

  // (se mantiene tu grid anterior por si lo usas en otro lado)
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 10 },

  // ===== Nuevos estilos para carrusel horizontal apilado de a dos =====
  categoriesListContent: { paddingLeft: 20, paddingRight: 12 },
  categoryColumn: { marginRight: 10, justifyContent: 'space-between' },
  categoryCardWrapper: { marginBottom: 10 },

  // Reutiliza tus estilos de tarjeta
  categoryCard: { width: 110, height: 110, margin: 0, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  categoryImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  categoryLabel: { position: 'absolute', bottom: 8, left: 8, color: '#fff', fontWeight: '600', fontSize: 14 },

  recommendContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 20 },
  recommendPill: {
    backgroundColor: '#3E2670',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6A39FF',
    marginRight: 10,
    marginBottom: 10,
  },
  recommendText: { fontSize: 14, color: '#fff', fontWeight: '500' },
  resultSection: { marginHorizontal: 20, marginBottom: 20 },
  resultTitle: { color: '#ccc', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  venueCard: { backgroundColor: '#3E2670', padding: 12, borderRadius: 10, marginBottom: 10 },
  venueName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  venueType: { color: '#ccc', fontSize: 14, marginTop: 2 },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2C005F',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 20, textAlign: 'center' },
  radiusOption: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#6A39FF' },
  radiusText: { fontSize: 16, color: '#fff', textAlign: 'center' },
  closeText: { color: '#ccc', marginTop: 20, textAlign: 'center', fontSize: 14 },

  // 🔧 NUEVO: overlay para las tarjetas de categoría (evita error si se usa)
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});

