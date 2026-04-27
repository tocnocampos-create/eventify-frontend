import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin, Clock } from 'lucide-react-native';
import colors from '../../theme/colors';
import { formatEventDateTime, formatPrice } from '../../utils/mapHelpers';
import { normalizeCategory } from '../../utils/filters.schema';
import { categoryColors } from '../../utils/pinColors';
import { getCinemaSchedule } from '../../utils/cinemaGrouping';

const SPRING = { damping: 16, stiffness: 160, mass: 0.8 };
const CINE_BLUE = colors.pinCine;
const CINE_LIGHT = 'rgba(59, 82, 216, 0.15)';
const CINE_BORDER = 'rgba(59, 82, 216, 0.3)';

const badgeColors = {
  'Música': colors.badgeMusica,
  'Teatro': colors.badgeTeatro,
  'Comedia': colors.badgeComedia,
  'Arte': colors.badgeArte,
  'Cine': colors.badgeCine,
};

export default function EventCard({ item, index, isSelected, onPress, onVerHorarios }) {
  const category = normalizeCategory(item?.category);
  const catColor = categoryColors[category] || colors.primary;
  const isSoldOut = !!item?.isSoldOut;
  const badgeBg = badgeColors[category] || 'rgba(159, 123, 255, 0.2)';
  const isCinemaGroup = !!item?._isCinemaGroup;

  // ─── Selection animation ───
  const scale = useSharedValue(isSelected ? 1.04 : 1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.04 : 1, SPRING);
  }, [isSelected]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // For cinema groups, show today's first format + time
  const todaySchedule = isCinemaGroup
    ? getCinemaSchedule(item.showtimes || [], 1)[0]
    : null;
  const totalShowtimes = isCinemaGroup ? (item.showtimes || []).length : 0;

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
          {isSoldOut && (
            <View style={styles.soldOutBadge}>
              <Text style={styles.soldOutText}>Agotado</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

          {isCinemaGroup ? (
            <>
              {/* Cinema meta: showtime count */}
              <View style={styles.metaRow}>
                <Clock size={12} color={colors.textDim} />
                <Text style={styles.metaText}>
                  {totalShowtimes} {totalShowtimes === 1 ? 'función' : 'funciones'}
                </Text>
              </View>
              {!!(item.venueName || item.location) && (
                <View style={styles.metaRow}>
                  <MapPin size={12} color={colors.textDim} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.venueName || item.location}
                  </Text>
                </View>
              )}
              {/* Today's first times preview */}
              {todaySchedule && (
                <View style={styles.timesPreview}>
                  {todaySchedule.formats.slice(0, 2).map(({ format, times }) => (
                    <View key={format} style={styles.timesPreviewRow}>
                      <Text style={styles.timesPreviewFormat}>{format}</Text>
                      <Text style={styles.timesPreviewTimes} numberOfLines={1}>
                        {times.slice(0, 3).join('  ')}
                        {times.length > 3 ? ' …' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {/* Ver horarios button */}
              {!!onVerHorarios && (
                <TouchableOpacity
                  style={styles.verHorariosBtn}
                  onPress={(e) => { e.stopPropagation?.(); onVerHorarios(item); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.verHorariosBtnText}>Ver horarios</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
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
            </>
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
  soldOutBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(229, 62, 62, 0.90)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  soldOutText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.3,
  },

  // ── Cinema group extras ──────────────────────────────────────────────────────
  timesPreview: {
    marginTop: 7,
    gap: 3,
  },
  timesPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timesPreviewFormat: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    color: '#A0B4FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    minWidth: 28,
  },
  timesPreviewTimes: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
    flex: 1,
  },
  verHorariosBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: CINE_LIGHT,
    borderWidth: 1,
    borderColor: CINE_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  verHorariosBtnText: {
    color: '#A0B4FF',
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
});
