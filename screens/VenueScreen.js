import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

import eventsData from '../data/events';
import venues from '../data/venues';
import { normalizeVenueType } from '../utils/venueTypes';

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

export default function VenueScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { venueName } = route.params;

  // Buscar info del venue desde venues.js
  const venueInfo = venues.find(v => v.name.toLowerCase() === venueName.toLowerCase());

  // Si no se encuentra el venue, mostrar mensaje
  if (!venueInfo) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#fff' }}>Venue no encontrado.</Text>
      </View>
    );
  }

  const coverImage = venueInfo.coverImage || require('../assets/venue-default-cover.png');
  const profileImage = venueInfo.profileImage || require('../assets/venue-default-profile.png');
  const { type: rawVenueType, city: venueCity, menuPdfUrl, websiteUrl, photos } = venueInfo;
  
  // Create array of images: coverImage first, then photos array if it exists, then profileImage
  const venueImages = useMemo(() => {
    const images = [coverImage];
    if (photos && Array.isArray(photos) && photos.length > 0) {
      images.push(...photos);
    }
    // Only add profileImage if it's different from coverImage
    if (profileImage !== coverImage) {
      images.push(profileImage);
    }
    return images;
  }, [coverImage, profileImage, photos]);

  // State for image lightbox
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const galleryRef = useRef(null);
  let venueType;
  try {
    venueType = normalizeVenueType(rawVenueType, { context: `venue "${venueInfo.name}"` });
  } catch (error) {
    console.error(error);
    venueType = rawVenueType || 'Bar';
  }

  const today = dayjs();

  const filteredEvents = eventsData.filter(
    (event) => {
      const eventLocation = (event.location || '').toLowerCase();
      const venueNameLower = venueName.toLowerCase();
      // Match if location exactly matches venue name, or if venue name is contained in location
      return eventLocation === venueNameLower || eventLocation.includes(venueNameLower);
    }
  );

  const upcomingEvents = filteredEvents.filter(
    (event) => dayjs(event.date).isSame(today, 'day') || dayjs(event.date).isAfter(today, 'day')
  );

  const pastEvents = filteredEvents
    .filter((event) => dayjs(event.date).isBefore(today, 'day'))
    .sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix());

  // Determine which button to show and what URL to use
  const hasMenu = !!menuPdfUrl;
  const hasWebsite = !!websiteUrl;
  const showMenuButton = hasMenu || hasWebsite; // Show button if either is available
  const buttonUrl = hasMenu ? menuPdfUrl : websiteUrl; // Prefer menu, fallback to website
  const buttonText = hasMenu ? 'Menú' : 'Sitio Web';

  const handleBackPress = () => {
    navigation.goBack();
  };

  const openLightbox = (index) => {
    setCurrentImageIndex(index);
    setLightboxVisible(true);
  };

  const closeLightbox = () => {
    setLightboxVisible(false);
  };

  const navigateImage = (direction) => {
    if (direction === 'next') {
      const newIndex = (currentImageIndex + 1) % venueImages.length;
      setCurrentImageIndex(newIndex);
      // Scroll gallery to match
      if (galleryRef.current) {
        galleryRef.current.scrollToIndex({ index: newIndex, animated: false });
      }
    } else {
      const newIndex = (currentImageIndex - 1 + venueImages.length) % venueImages.length;
      setCurrentImageIndex(newIndex);
      // Scroll gallery to match
      if (galleryRef.current) {
        galleryRef.current.scrollToIndex({ index: newIndex, animated: false });
      }
    }
  };

  // Format date/time as "DD MMM YYYY, HH:mm" - e.g., "05 nov 2025, 21:30"
  const formatEventDateTime = (event) => {
    const d = event?.date ? dayjs(event.date) : null;
    if (!d || !d.isValid()) return '';
    const datePart = d.format('DD MMM YYYY').toLowerCase(); // e.g., "05 nov 2025"
    const timePart = event?.timeStart || event?.hour || null;
    if (timePart) {
      // Ensure time is in HH:mm format (24-hour)
      let formattedTime = timePart;
      if (typeof timePart === 'string') {
        // If time includes 'hrs' or other text, extract just the time
        const timeMatch = timePart.match(/(\d{1,2}):?(\d{2})?/);
        if (timeMatch) {
          const hours = timeMatch[1].padStart(2, '0');
          const minutes = timeMatch[2] || '00';
          formattedTime = `${hours}:${minutes}`;
        } else {
          // If already in HH:mm format, use as is
          formattedTime = timePart;
        }
      }
      return `${datePart}, ${formattedTime}`;
    }
    return datePart;
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('EventDetail', { event: item })}>
      <View style={styles.eventItem}>
        {item.image && (
          <Image source={{ uri: item.image }} style={styles.eventImage} />
        )}
        <View style={styles.eventTextContainer}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventPrice}>Desde {item.price || '$0'}</Text>
          <Text style={styles.eventDate}>{formatEventDateTime(item)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPastEventCard = ({ item }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('EventDetail', { event: item })}
      style={styles.pastEventCard}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.pastEventImage} />
      ) : (
        <View style={styles.pastEventImagePlaceholder} />
      )}
      <Text style={styles.pastEventTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.ratingRow}>
        <MaterialIcons name="star" size={14} color="#FFD166" />
        <Text style={styles.ratingText}>4.7</Text>
      </View>
    </TouchableOpacity>
  );

  // Helper function to normalize image source (handles both require() and URL strings)
  const getImageSource = (image) => {
    if (typeof image === 'string') {
      return { uri: image };
    }
    return image; // For require() statements
  };

  const renderImageItem = ({ item, index }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => openLightbox(index)}
      style={styles.imageItem}
    >
      <Image source={getImageSource(item)} style={styles.coverImage} resizeMode="cover" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.wrapper} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Galería de imágenes horizontal */}
        <View style={styles.imageGalleryContainer}>
          <FlatList
            ref={galleryRef}
            data={venueImages}
            renderItem={renderImageItem}
            keyExtractor={(item, index) => `venue-image-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={SCREEN_WIDTH}
            decelerationRate="fast"
            scrollEnabled={venueImages.length > 1}
            onScrollToIndexFailed={(info) => {
              // Handle scroll to index failure gracefully
              const wait = new Promise(resolve => setTimeout(resolve, 500));
              wait.then(() => {
                galleryRef.current?.scrollToIndex({ index: info.index, animated: false });
              });
            }}
          />
        </View>

      {/* Botón atrás */}
      <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Info principal */}
      <View style={styles.profileContainer}>
        <Image source={profileImage} style={styles.profileImage} />
        <Text style={styles.venueName}>{venueName}</Text>
        <Text style={styles.venueDetails}>{venueType} • {venueCity}</Text>
        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.followButton}>
            <Text style={styles.buttonText}>Seguir</Text>
          </TouchableOpacity>
          {showMenuButton && (
            <TouchableOpacity 
              style={styles.reserveButton}
              onPress={() => {
                if (buttonUrl) {
                  WebBrowser.openBrowserAsync(buttonUrl);
                }
              }}
            >
              <Text style={styles.reserveText}>{buttonText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Exposiciones (solo para Museos) */}
      {venueType === 'Museo' && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exposiciones temporales</Text>
            <View style={styles.emptyExhibitionContainer}>
              <Ionicons name="image-outline" size={32} color="#9F7BFF" />
              <Text style={styles.emptyExhibitionText}>
                No hay exposiciones temporales disponibles en este momento.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exposiciones permanentes</Text>
            <View style={styles.emptyExhibitionContainer}>
              <Ionicons name="image-outline" size={32} color="#9F7BFF" />
              <Text style={styles.emptyExhibitionText}>
                No hay información de exposiciones permanentes disponible.
              </Text>
            </View>
          </View>
        </>
      )}

      {/* Próximos eventos */}
      {upcomingEvents.length > 0 && (
        <View style={styles.upcomingEventsSection}>
          <Text style={styles.upcomingEventsTitle}>Próximos eventos</Text>
          <FlatList
            data={upcomingEvents}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Reseñas */}
      <View style={styles.section}>
        <Text style={styles.upcomingEventsTitle}>Reseñas</Text>
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

      {/* Eventos pasados */}
      {pastEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eventos pasados</Text>
          <FlatList
            data={pastEvents}
            renderItem={renderPastEventCard}
            keyExtractor={(item) => item.id.toString() + '-past'}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pastEventsCarousel}
          />
        </View>
      )}

      {/* Menú / Sitio Web */}
      {(hasMenu || hasWebsite) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{hasMenu ? 'Menú' : 'Sitio Web'}</Text>
          {hasMenu ? (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => WebBrowser.openBrowserAsync(menuPdfUrl)}
            >
              <Text style={styles.menuButtonText}>Ver Menú</Text>
            </TouchableOpacity>
          ) : hasWebsite ? (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => WebBrowser.openBrowserAsync(websiteUrl)}
            >
              <Text style={styles.menuButtonText}>Visitar Sitio Web</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.menuText}>Este venue aún no ha subido su información.</Text>
          )}
        </View>
      )}

      {/* Lightbox Modal */}
      <Modal
        visible={lightboxVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeLightbox}
      >
        <View style={styles.lightboxContainer}>
          <TouchableOpacity
            style={styles.lightboxCloseButton}
            onPress={closeLightbox}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          <View style={styles.lightboxImageContainer}>
            <Image
              source={getImageSource(venueImages[currentImageIndex])}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          </View>

          {venueImages.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.lightboxNavButton, styles.lightboxNavButtonLeft]}
                onPress={() => navigateImage('prev')}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={32} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.lightboxNavButton, styles.lightboxNavButtonRight]}
                onPress={() => navigateImage('next')}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-forward" size={32} color="#fff" />
              </TouchableOpacity>

              <View style={styles.lightboxIndicator}>
                <Text style={styles.lightboxIndicatorText}>
                  {currentImageIndex + 1} / {venueImages.length}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#1B1036',
  },
  container: {
    backgroundColor: '#1B1036',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageGalleryContainer: {
    width: '100%',
    height: 200,
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: 200,
  },
  imageItem: {
    width: SCREEN_WIDTH,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 30,
    zIndex: 10,
  },
  profileContainer: {
    alignItems: 'center',
    marginTop: -40,
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: 8,
  },
  venueName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  venueDetails: {
    color: '#bbb',
    fontSize: 14,
    marginBottom: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3A2D70',
    borderRadius: 20,
  },
  reserveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#9B5DE5',
    borderRadius: 20,
  },
  buttonText: {
    color: '#fff',
  },
  reserveText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  upcomingEventsSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  upcomingEventsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  eventItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
    paddingVertical: 4,
  },
  eventImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  eventTextContainer: {
    flex: 1,
    paddingVertical: 2,
  },
  eventTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
  },
  eventPrice: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
  },
  eventDate: {
    color: '#bbb',
    fontSize: 13,
    lineHeight: 18,
  },
  menuText: {
    color: '#bbb',
    fontSize: 14,
  },
  menuButton: {
    backgroundColor: '#9B5DE5',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  menuButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  pastEventsCarousel: {
    paddingRight: 20,
  },
  pastEventCard: {
    marginRight: 12,
    width: 150,
  },
  pastEventImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  pastEventImagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#2B245C',
  },
  pastEventTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#bbb',
    fontSize: 12,
    marginLeft: 4,
  },
  reviewCard: {
    backgroundColor: '#1A123D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  reviewUser: {
    fontWeight: '700',
    color: '#fff',
    fontSize: 14,
  },
  reviewComment: {
    color: '#ccc',
    marginTop: 8,
    lineHeight: 20,
    fontSize: 13,
  },
  addReviewButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#BFA0FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addReviewText: {
    color: '#22003D',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },
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
    borderRadius: 25,
    padding: 8,
  },
  lightboxImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  lightboxNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 12,
    zIndex: 10,
  },
  lightboxNavButtonLeft: {
    left: 20,
  },
  lightboxNavButtonRight: {
    right: 20,
  },
  lightboxIndicator: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  lightboxIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyExhibitionContainer: {
    backgroundColor: '#1A123D',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(159, 123, 255, 0.2)',
    minHeight: 120,
  },
  emptyExhibitionText: {
    color: '#bbb',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});

