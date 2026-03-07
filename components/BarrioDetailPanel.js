import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Platform,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useDragScroll from '../hooks/useDragScroll';

/**
 * BarrioDetailPanel - A modal overlay panel that displays detailed information about a barrio
 * 
 * How tap on barrio is handled:
 * - In HomeScreen, when a user taps a barrio polygon, the onBarrioPress callback is triggered
 * - This sets the selectedBarrio state, which opens this panel
 * - The panel appears with a smooth animation and dims the background map
 * 
 * How to change the layout:
 * - Modify the styles.panel to adjust panel size, position, or appearance
 * - Modify styles.photoGallery to change photo gallery dimensions
 * - Modify styles.contentSection to adjust spacing between sections
 * 
 * How to plug in new barrios, photos and recommendations:
 * - Add photos: Add image URLs or require() statements to the barrio's photos array in data/barrios.js
 * - Add recommendations: Add objects with category and items arrays to the barrio's recommendations array
 * - See data/barrios.js for examples and detailed comments
 * 
 * @param {Object} barrio - The barrio object with id, name, photos, shortDescription, recommendations
 * @param {boolean} visible - Whether the panel is visible
 * @param {function} onClose - Callback to close the panel
 */
export default function BarrioDetailPanel({ barrio, visible, onClose, venues = [] }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const navigation = useNavigation();
  const dragRef = useDragScroll();
  const [photoIndex, setPhotoIndex] = useState(0);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!barrio) return null;

  const photos = barrio.photos || [];
  const recommendations = barrio.recommendations || [];

  // Handle tap outside panel to close
  const handleBackdropPress = () => {
    onClose();
  };

  // Handle photo gallery scroll
  const handlePhotoScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setPhotoIndex(index);
  };

  // Find matching venue for a recommendation item
  const findMatchingVenue = (itemName) => {
    if (!itemName) return null;
    
    const itemNameLower = itemName.trim().toLowerCase();
    
    // Try exact match first (case insensitive)
    let venue = venues.find(v => v.name.toLowerCase().trim() === itemNameLower);
    
    // If no exact match, try partial match (item contains venue name or venue contains item)
    if (!venue) {
      venue = venues.find(v => {
        const venueNameLower = v.name.toLowerCase().trim();
        return venueNameLower.includes(itemNameLower) || itemNameLower.includes(venueNameLower);
      });
    }
    
    return venue;
  };

  // Handle recommendation item press
  const handleRecommendationPress = (itemName) => {
    const venue = findMatchingVenue(itemName);
    if (venue) {
      onClose(); // Close barrio panel first
      // Use setTimeout to ensure modal closes before navigation
      setTimeout(() => {
        navigation.navigate('VenueScreen', { venueId: venue.id, venueName: venue.name });
      }, 100);
    } else {
      // Debug: log when venue is not found
      console.log('Venue not found for:', itemName);
      console.log('Available venues:', venues.map(v => v.name).slice(0, 10));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Dimmed background overlay */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleBackdropPress}
      >
        <Animated.View
          style={[
            styles.backdropDimmed,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          ]}
        />
      </TouchableOpacity>

      {/* Panel content */}
      <Animated.View
        style={[
          styles.panel,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Barrio name */}
          <Text style={styles.barrioName}>{barrio.name}</Text>

          {/* Photo gallery */}
          {photos.length > 0 ? (
            <View style={styles.photoGalleryContainer}>
              <FlatList
                ref={dragRef}
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handlePhotoScroll}
                scrollEventThrottle={16}
                keyExtractor={(item, index) => `photo-${index}`}
                getItemLayout={(data, index) => ({
                  length: SCREEN_WIDTH - 40,
                  offset: (SCREEN_WIDTH - 40) * index,
                  index,
                })}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={[styles.photo, { width: SCREEN_WIDTH - 40, ...(Platform.OS === 'web' && { width: Math.min(SCREEN_WIDTH - 40, 560) }) }]}
                    resizeMode="cover"
                  />
                )}
              />
              {/* Photo indicator dots */}
              {photos.length > 1 && (
                <View style={styles.photoIndicators}>
                  {photos.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.photoIndicator,
                        index === photoIndex && styles.photoIndicatorActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="image-outline" size={48} color="#9F7BFF" />
            </View>
          )}

          {/* Schedule pill and Keywords pills */}
          <View style={styles.pillsContainer}>
            {barrio.schedule && (
              <View style={styles.schedulePill}>
                <Ionicons name="time-outline" size={16} color="#9F7BFF" style={styles.scheduleIcon} />
                <Text style={styles.scheduleText}>
                  {barrio.schedule.open} - {barrio.schedule.close}
                </Text>
              </View>
            )}
            {barrio.keywords && barrio.keywords.length > 0 && (
              <>
                {barrio.keywords.map((keyword, index) => (
                  <View key={index} style={styles.keywordPill}>
                    <Text style={styles.keywordText}>{keyword}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Short description */}
          {barrio.shortDescription && (
            <View style={styles.contentSection}>
              <Text style={styles.description}>{barrio.shortDescription}</Text>
            </View>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.contentSection}>
              <Text style={styles.recommendationsTitle}>Recomendaciones</Text>
              {recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationCategory}>
                  <Text style={styles.recommendationCategoryTitle}>
                    {rec.category}
                  </Text>
                  {rec.items && rec.items.length > 0 && (
                    <View style={styles.recommendationItems}>
                      {rec.items.map((item, itemIndex) => {
                        const matchingVenue = findMatchingVenue(item);
                        const isClickable = !!matchingVenue;
                        
                        return (
                          <TouchableOpacity
                            key={itemIndex}
                            style={[
                              styles.recommendationItem,
                              isClickable && styles.recommendationItemClickable
                            ]}
                            onPress={isClickable ? () => handleRecommendationPress(item) : undefined}
                            disabled={!isClickable}
                            activeOpacity={isClickable ? 0.7 : 1}
                          >
                            <Ionicons
                              name={isClickable ? "chevron-forward-outline" : "location-outline"}
                              size={16}
                              color="#9F7BFF"
                              style={styles.recommendationItemIcon}
                            />
                            <Text style={styles.recommendationItemText}>
                              {item}
                            </Text>
                            {isClickable && (
                              <Ionicons
                                name="arrow-forward"
                                size={16}
                                color="#9F7BFF"
                                style={styles.recommendationItemArrow}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  backdropDimmed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C0A3E', // Eventify dark purple background
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    ...(Platform.OS === 'web' && {
      maxWidth: 600, // Limit width on web for better UX
      alignSelf: 'center',
      maxHeight: '85vh',
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(159, 123, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(159, 123, 255, 0.4)',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  barrioName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  photoGalleryContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  photo: {
    height: 240,
  },
  photoPlaceholder: {
    backgroundColor: '#2B245C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  schedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(159, 123, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(159, 123, 255, 0.3)',
  },
  scheduleIcon: {
    marginRight: 6,
  },
  scheduleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9F7BFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  keywordPill: {
    backgroundColor: 'rgba(159, 123, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(159, 123, 255, 0.3)',
  },
  keywordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9F7BFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  photoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  photoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(159, 123, 255, 0.3)',
  },
  photoIndicatorActive: {
    backgroundColor: '#9F7BFF',
    width: 24,
  },
  contentSection: {
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  recommendationsTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  recommendationCategory: {
    marginBottom: 20,
  },
  recommendationCategoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9F7BFF', // Eventify purple
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  recommendationItems: {
    gap: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(159, 123, 255, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#9F7BFF',
  },
  recommendationItemClickable: {
    backgroundColor: 'rgba(159, 123, 255, 0.15)',
    borderLeftColor: '#BFA0FF',
  },
  recommendationItemIcon: {
    marginRight: 10,
  },
  recommendationItemText: {
    fontSize: 15,
    color: '#E0E0E0',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  recommendationItemArrow: {
    marginLeft: 8,
  },
});

