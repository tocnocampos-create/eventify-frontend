import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import GlassOverlay from './GlassOverlay';
import colors from '../../theme/colors';
import { categoryColors } from '../../utils/pinColors';
import { formatPrice } from '../../utils/mapHelpers';

export default function FilterPanel({
  filters,
  selectedDateTag,
  selectedCategories,
  selectedTypes,
  hasSelectedCategory,
  availableTypes,
  maxPrice,
  showPricePanel,
  onToggleFilter,
  onSetMaxPrice,
  onTogglePricePanel,
  style,
}) {
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={style}>
      <GlassOverlay style={styles.container} borderRadius={16}>
        {/* Date */}
        <View>
          <Text style={styles.sectionHeader}>Fecha</Text>
          <View style={styles.options}>
            {filters.Date.map((option) => {
              const isActive = selectedDateTag === option;
              return isActive ? (
                <TouchableOpacity key={`date-${option}`} onPress={() => onToggleFilter(option)}>
                  <LinearGradient
                    colors={[colors.authGradientStart, colors.authGradientEnd]}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>{option}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  key={`date-${option}`}
                  onPress={() => onToggleFilter(option)}
                  style={[styles.chip, styles.chipInactive]}
                >
                  <Text style={styles.chipText}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Category */}
        <View>
          <Text style={styles.sectionHeader}>Categoría</Text>
          <View style={styles.options}>
            {filters.Category.map((option) => {
              const isActive = selectedCategories.has(option);
              const dotColor = categoryColors[option];
              return isActive ? (
                <TouchableOpacity key={`cat-${option}`} onPress={() => onToggleFilter(option)}>
                  <LinearGradient
                    colors={[colors.authGradientStart, colors.authGradientEnd]}
                    style={styles.chip}
                  >
                    {dotColor && <View style={[styles.catDot, { backgroundColor: dotColor }]} />}
                    <Text style={styles.chipText}>{option}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  key={`cat-${option}`}
                  onPress={() => onToggleFilter(option)}
                  style={[styles.chip, styles.chipInactive]}
                >
                  {dotColor && <View style={[styles.catDot, { backgroundColor: dotColor, opacity: 0.5 }]} />}
                  <Text style={styles.chipText}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Type */}
        {hasSelectedCategory && availableTypes.length > 0 && (
          <View>
            <Text style={styles.sectionHeader}>Tipo</Text>
            <View style={styles.options}>
              {availableTypes.map((option) => {
                const displayType = typeof option === 'object' ? option.type : option;
                const typeKey = typeof option === 'object' ? `${option.category}::${option.type}` : option;
                const isActive = selectedTypes.has(typeKey);
                return isActive ? (
                  <TouchableOpacity key={`type-${typeKey}`} onPress={() => onToggleFilter(option)}>
                    <LinearGradient
                      colors={[colors.authGradientStart, colors.authGradientEnd]}
                      style={styles.chip}
                    >
                      <Text style={styles.chipText}>{displayType}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    key={`type-${typeKey}`}
                    onPress={() => onToggleFilter(option)}
                    style={[styles.chip, styles.chipInactive]}
                  >
                    <Text style={styles.chipText}>{displayType}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Price */}
        <View>
          <TouchableOpacity
            onPress={onTogglePricePanel}
            style={styles.priceHeader}
          >
            <Text style={styles.sectionHeader}>Precio</Text>
            {showPricePanel
              ? <ChevronUp size={20} color="#fff" />
              : <ChevronDown size={20} color="#fff" />
            }
          </TouchableOpacity>
          {showPricePanel && (
            <View style={styles.pricePanel}>
              <Text style={styles.priceLabel}>
                Gratis - {formatPrice(maxPrice)}
              </Text>
              <View style={{ paddingHorizontal: 10 }}>
                <Slider
                  minimumValue={0}
                  maximumValue={300000}
                  step={500}
                  value={maxPrice}
                  onValueChange={onSetMaxPrice}
                  minimumTrackTintColor={colors.authGradientStart}
                  maximumTrackTintColor={colors.textDim}
                  thumbTintColor={colors.authGradientStart}
                />
              </View>
              <View style={styles.priceRange}>
                <Text style={styles.priceRangeText}>Gratis</Text>
                <Text style={styles.priceRangeText}>{formatPrice(300000)}</Text>
              </View>
              <View style={styles.priceActions}>
                <TouchableOpacity style={styles.priceActionBtn} onPress={() => onSetMaxPrice(0)}>
                  <Text style={styles.priceActionText}>Solo Gratis</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.priceActionBtn} onPress={() => onSetMaxPrice(300000)}>
                  <Text style={styles.priceActionText}>Restablecer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </GlassOverlay>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  sectionHeader: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 6,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  chipInactive: {
    backgroundColor: colors.glassLight,
  },
  chipText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  pricePanel: {
    backgroundColor: colors.glassLight,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },
  priceLabel: {
    color: colors.textDim,
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
    marginBottom: 12,
  },
  priceRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 4,
  },
  priceRangeText: {
    color: colors.textDim,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
  priceActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    gap: 12,
  },
  priceActionBtn: {
    flex: 1,
    backgroundColor: colors.glass,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  priceActionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
});
