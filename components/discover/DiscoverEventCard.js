import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin } from 'lucide-react-native';
import colors from '../../theme/colors';
import { formatEventDateTime, formatPrice } from '../../utils/mapHelpers';
import { normalizeCategory } from '../../utils/filters.schema';
import { categoryColors } from '../../utils/pinColors';

export default function DiscoverEventCard({ event, badgeColors = {}, onPress }) {
  const category = normalizeCategory(event?.category);
  const catColor = categoryColors[category] || colors.primary;
  const badgeBg = badgeColors[category] || 'rgba(159, 123, 255, 0.2)';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: event.image }} style={styles.image} />
        <LinearGradient
          colors={['transparent', 'rgba(15, 5, 35, 0.85)']}
          style={StyleSheet.absoluteFillObject}
        />
        {!!category && (
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={styles.badgeText}>{category}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        <View style={styles.metaRow}>
          <Calendar size={13} color={colors.textDim} />
          <Text style={styles.metaText}>{formatEventDateTime(event)}</Text>
        </View>
        {!!event.location && (
          <View style={styles.metaRow}>
            <MapPin size={13} color={colors.textDim} />
            <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
          </View>
        )}
        {event.price != null && (
          <Text style={styles.price}>
            {event.price === 0 ? 'Gratis' : `Desde ${formatPrice(event.price)}`}
          </Text>
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
}

const styles = StyleSheet.create({
  card: {
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
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 120 },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontFamily: 'Outfit_500Medium' },
  info: { padding: 10 },
  title: { color: colors.text, fontSize: 15, fontFamily: 'Outfit_700Bold', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 },
  metaText: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.textDim },
  price: { color: colors.text, fontSize: 14, fontFamily: 'Outfit_600SemiBold', marginTop: 6 },
  bottomAccent: { height: 2 },
});
