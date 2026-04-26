import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import useDragScroll from '../../hooks/useDragScroll';
import { X } from 'lucide-react-native';
import GlassOverlay from './GlassOverlay';
import colors from '../../theme/colors';
import { getCategoryBorderColor } from '../../utils/pinColors';

export default function FilterPills({ filters, onRemove, style }) {
  const dragRef = useDragScroll();
  if (!filters || filters.length === 0) return null;

  return (
    <ScrollView
      ref={dragRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={[styles.content, style]}
    >
      {filters.map((filterItem, index) => {
        const borderColor = filterItem.type === 'category'
          ? getCategoryBorderColor(filterItem.value)
          : null;
        return (
          <Animated.View
            key={`${filterItem.type}-${filterItem.value}-${index}`}
            entering={FadeInDown.delay(index * 50).springify().damping(15).stiffness(200)}
          >
            <GlassOverlay
              style={[styles.pill, index > 0 && { marginLeft: 8 }]}
              borderRadius={22}
            >
              {borderColor && <View style={[styles.accentBar, { backgroundColor: borderColor }]} />}
              <Text style={styles.text}>{filterItem.label}</Text>
              <TouchableOpacity onPress={() => onRemove(filterItem)} style={styles.removeBtn}>
                <X size={12} color={colors.primary} />
              </TouchableOpacity>
            </GlassOverlay>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // flex: 1 is critical — without it the ScrollView sizes to its natural content
  // width (all pills combined) instead of filling the available flex space.
  // When content overflows the flex allocation it renders on top of the
  // DateSelector (which precedes it in the DOM), making the date selector
  // unresponsive to taps (useDragScroll's mousedown listener intercepts them).
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingRight: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  accentBar: {
    width: 3,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  removeBtn: {
    marginLeft: 6,
    padding: 2,
  },
});
