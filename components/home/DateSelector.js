import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import GlassOverlay from './GlassOverlay';
import colors from '../../theme/colors';
import dayjs from 'dayjs';

export default function DateSelector({
  currentDate,
  onPrev,
  onNext,
  onPress,
  activeDateFilterDisplay,
  selectedDays,
}) {
  let displayText;

  if (activeDateFilterDisplay) {
    displayText = activeDateFilterDisplay;
  } else if (selectedDays.length === 1) {
    displayText = dayjs(selectedDays[0]).format('DD MMM');
  } else if (selectedDays.length > 1) {
    const sortedDays = [...selectedDays].sort();
    const earliest = dayjs(sortedDays[0]);
    const latest = dayjs(sortedDays[sortedDays.length - 1]);
    displayText = `${earliest.format('DD MMM')} - ${latest.format('DD MMM')}`;
  } else {
    displayText = currentDate.format('DD MMM');
  }

  return (
    <GlassOverlay style={styles.container} borderRadius={22}>
      <TouchableOpacity onPress={onPrev} style={styles.arrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
        <ChevronLeft size={16} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onPress} style={styles.center} activeOpacity={0.7}>
        <Text style={styles.text}>{displayText}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onNext} style={styles.arrow} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
        <ChevronRight size={16} color="#fff" />
      </TouchableOpacity>
    </GlassOverlay>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  arrow: {
    padding: 2,
  },
  center: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
});
