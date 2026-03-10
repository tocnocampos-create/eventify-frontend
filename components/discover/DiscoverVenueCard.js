import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import colors from '../../theme/colors';

const defaultProfile = require('../../assets/venue-default-profile.png');

function getImageSource(img) {
  if (typeof img === 'number') return img;
  if (typeof img === 'string' && /^https?:\/\//i.test(img)) return { uri: img };
  return null;
}

export default function DiscoverVenueCard({ venue, distanceKm, onPress }) {
  const profileImage = getImageSource(venue.profileImage) || defaultProfile;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.imageRing}>
        <Image source={profileImage} style={styles.image} />
      </View>
      <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
      <Text style={styles.type}>{venue.type}</Text>
      {distanceKm != null && (
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{distanceKm} km</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  imageRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  image: { width: 60, height: 60, borderRadius: 30 },
  name: { color: colors.text, fontFamily: 'Outfit_600SemiBold', fontSize: 14, textAlign: 'center' },
  type: { color: colors.textDim, fontSize: 12, fontFamily: 'Outfit_400Regular', textAlign: 'center' },
  distanceBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(159, 123, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  distanceText: { color: colors.primary, fontSize: 11, fontFamily: 'Outfit_500Medium' },
});
