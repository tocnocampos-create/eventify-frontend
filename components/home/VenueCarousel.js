import React from 'react';
import { View, Text, FlatList, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import EventCard from './EventCard';
import colors from '../../theme/colors';
import { emojiForVenue } from '../../utils/pinColors';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function VenueCarousel({
  venueEvents,
  venueIndex,
  selectedVenueMeta,
  selectedVenue,
  pan,
  panResponder,
  onCardPress,
  onMomentumScrollEnd,
}) {
  const panelHeight = SCREEN_HEIGHT * 0.32;
  const venueName = selectedVenueMeta
    ? `${emojiForVenue(selectedVenueMeta.type)} ${selectedVenueMeta.name}`
    : selectedVenue?.name || '';
  const venueType = selectedVenueMeta?.type || '';

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.container, { height: panelHeight, transform: [{ translateY: pan }] }]}
    >
      <LinearGradient
        colors={['rgba(28, 10, 62, 0.95)', colors.bg]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.swipeBar}
        />
        <View style={styles.header}>
          <Text style={styles.venueName}>{venueName}</Text>
          {!!venueType && <Text style={styles.venueType}>{venueType}</Text>}
        </View>

        <FlatList
          horizontal
          data={venueEvents}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => (
            <EventCard
              item={item}
              index={index}
              isSelected={false}
              onPress={onCardPress}
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10 }}
          snapToInterval={270}
          decelerationRate="fast"
          getItemLayout={(data, index) => ({
            length: 270,
            offset: 270 * index,
            index,
          })}
          initialScrollIndex={venueEvents.length > 0 ? venueIndex : 0}
          onMomentumScrollEnd={onMomentumScrollEnd}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 20,
  },
  swipeBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  venueName: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Outfit_700Bold',
  },
  venueType: {
    color: colors.textDim,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
});
