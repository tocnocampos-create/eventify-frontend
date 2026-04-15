import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin } from 'lucide-react-native';
import colors from '../../theme/colors';
import { formatEventDateTime, formatPrice } from '../../utils/mapHelpers';
import { normalizeCategory } from '../../utils/filters.schema';
import { categoryColors } from '../../utils/pinColors';

const SPRING = { damping: 16, stiffness: 160, mass: 0.8 };

const badgeColors = {
  'Música': colors.badgeMusica,
  'Teatro': colors.badgeTeatro,
  'Comedia': colors.badgeComedia,
  'Arte': colors.badgeArte,
  'Cine': colors.badgeCine,
};

export default function EventCard({ item, index, isSelected, onPress }) {
  const category = normalizeCategory(item?.category);
  const catColor = categoryColors[category] || colors.primary;
  const badgeBg = badgeColors[category] || 'rgba(159, 123, 255, 0.2)';

  // ─── Selection animation ───
  const scale = useSharedValue(isSelected ? 1.04 : 1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.04 : 1, SPRING);
  }, [isSelected]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={() => onPress(item, index)}
      activeOpacity={0.9}
      style={{ width: 250, marginHorizontal: 10 }}
    >
      <Animated.View style={[
        styles.card,
        isSelected && styles.cardSelected,
        animatedCardStyle,
      ]}>
        <View style={styles.imageContainer}>
          {!!item.image ? (
            <>
              <Image source={{ uri: item.image }} style={styles.image} />
              <LinearGradient
                colors={['transparent', 'rgba(15, 5, 35, 0.85)']}
                style={styles.imageScrim}
              />
            </>
          ) : (
            <LinearGradient
              colors={[catColor, 'rgba(15, 5, 35, 0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imagePlaceholder}
            />
          )}
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={styles.badgeText}>{category}</Text>
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Calendar size={12} color={colors.textDim} />
            <Text style={styles.metaText}>{formatEventDateTime(item)}</Text>
          </View>
          {!!item.location && (
            <View style={styles.metaRow}>
              <MapPin size={12} color={colors.textDim} />
              <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
          {item.price != null && (
            <Text style={styles.price}>
              {item.price === 0 ? 'Gratis' : `Desde ${formatPrice(item.price)}`}
            </Text>
          )}
        </View>
        <LinearGradient
          colors={[catColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomAccent}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(28, 10, 62, 0.82)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 220,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.35)' },
    }),
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
      web: { boxShadow: '0 0 24px rgba(155, 93, 229, 0.35), 0 4px 20px rgba(0,0,0,0.35)' },
    }),
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  image: {
    width: '100%',
    height: 120,
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
  },
  imageScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  content: {
    padding: 10,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
    color: '#fff',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
  },
  price: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.primary,
    marginTop: 5,
  },
  bottomAccent: {
    height: 2,
  },
});
