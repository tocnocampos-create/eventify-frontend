import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Platform, Modal, Pressable,
} from 'react-native';
import { TreePine, Clock, X, MapPin } from 'lucide-react-native';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import colors from '../theme/colors';

dayjs.extend(isoWeek);

const GREEN = '#2D7D46';
const GREEN_LIGHT = 'rgba(45, 125, 70, 0.15)';

export default function AlaireLibreSheet({ venue, visible, onClose }) {
  const translateY = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 200,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!venue) return null;

  const todayDow = dayjs().isoWeekday(); // 1=Mon … 7=Sun
  const todaySchedule = venue.schedule?.find((s) => s.day_of_week === todayDow);
  const isClosed = !todaySchedule || todaySchedule.opens_at === '-';
  const scheduleText = isClosed
    ? 'Cerrado hoy'
    : `${todaySchedule.opens_at} – ${todaySchedule.closes_at}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <TreePine size={20} color={GREEN} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={2}>{venue.name}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{venue.type}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <X size={18} color={colors.textDim} />
          </TouchableOpacity>
        </View>

        {/* Schedule */}
        <View style={styles.row}>
          <Clock size={15} color={isClosed ? colors.textDim : GREEN} style={styles.rowIcon} />
          <Text style={[styles.rowText, isClosed && styles.rowTextDim]}>
            {scheduleText}
          </Text>
        </View>

        {/* City */}
        {venue.city && (
          <View style={styles.row}>
            <MapPin size={15} color={colors.textDim} style={styles.rowIcon} />
            <Text style={styles.rowTextDim}>{venue.city}</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 20 },
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.4)' },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    lineHeight: 22,
    marginBottom: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GREEN_LIGHT,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(45, 125, 70, 0.3)',
  },
  typeText: {
    color: '#4ADE80',
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
    flexShrink: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowIcon: {
    marginRight: 8,
  },
  rowText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  rowTextDim: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
});
