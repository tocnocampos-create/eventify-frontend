import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
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
      contentContainerStyle={[styles.content, style]}
    >
      {filters.map((filterItem, index) => {
        const borderColor = filterItem.type === 'category'
          ? getCategoryBorderColor(filterItem.value)
          : null;
        return (
          <GlassOverlay
            key={`${filterItem.type}-${filterItem.value}-${index}`}
            style={[styles.pill, index > 0 && { marginLeft: 8 }]}
            borderRadius={22}
          >
            {borderColor && <View style={[styles.accentBar, { backgroundColor: borderColor }]} />}
            <Text style={styles.text}>{filterItem.label}</Text>
            <TouchableOpacity onPress={() => onRemove(filterItem)} style={styles.removeBtn}>
              <X size={12} color={colors.primary} />
            </TouchableOpacity>
          </GlassOverlay>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
