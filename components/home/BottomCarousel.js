import React from 'react';
import { View, Text, FlatList, ScrollView, Animated, Platform, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarX2 } from 'lucide-react-native';
import EventCard from './EventCard';
import colors from '../../theme/colors';
import { categoryColors, getCategoryBorderColor } from '../../utils/pinColors';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function BottomCarousel({
  filteredEvents,
  selectedIndex,
  activeFilters,
  flatListRef,
  pan,
  panResponder,
  onCardPress,
  onScrollBeginDrag,
  onScrollEndDrag,
  onScroll,
  onMomentumScrollEnd,
}) {
  const panelHeight = SCREEN_HEIGHT * 0.25;

  // Filter out category-only pills
  const carouselFilters = activeFilters.filter(filter => {
    if (filter.includes(' \u00B7 ')) return true;
    return !categoryColors.hasOwnProperty(filter);
  });

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

        {carouselFilters.length > 0 && (
          <View style={styles.filterChips}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsContent}
            >
              {carouselFilters.map((filter, index) => {
                const borderColor = getCategoryBorderColor(filter);
                return (
                  <View
                    key={filter}
                    style={[
                      styles.chip,
                      index > 0 && { marginLeft: 6 },
                      borderColor && { borderWidth: 2, borderColor },
                    ]}
                  >
                    <Text style={styles.chipText}>{filter}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {filteredEvents.length > 0 && (
          <Text style={styles.countText}>{filteredEvents.length} eventos</Text>
        )}

        {filteredEvents.length > 0 ? (
          <FlatList
            ref={flatListRef}
            horizontal
            data={filteredEvents}
            renderItem={({ item, index }) => (
              <EventCard
                item={item}
                index={index}
                isSelected={selectedIndex === index}
                onPress={onCardPress}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 10 }}
            snapToInterval={270}
            snapToAlignment="start"
            decelerationRate={Platform.OS === 'web' ? 0.985 : 'fast'}
            pagingEnabled={Platform.OS === 'web'}
            scrollEventThrottle={16}
            getItemLayout={(data, index) => ({
              length: 270,
              offset: 270 * index,
              index,
            })}
            initialScrollIndex={0}
            onScrollBeginDrag={onScrollBeginDrag}
            onScrollEndDrag={onScrollEndDrag}
            onScroll={onScroll}
            onMomentumScrollEnd={onMomentumScrollEnd}
          />
        ) : (
          <View style={styles.emptyState}>
            <CalendarX2 size={32} color={colors.primaryDark} />
            <Text style={styles.emptyTitle}>No hay eventos para esta fecha</Text>
            <Text style={styles.emptySub}>Prueba cambiando la fecha o los filtros</Text>
          </View>
        )}
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
  filterChips: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  filterChipsContent: {
    alignItems: 'center',
  },
  chip: {
    backgroundColor: colors.glassLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  countText: {
    color: colors.textDim,
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySub: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },
});
