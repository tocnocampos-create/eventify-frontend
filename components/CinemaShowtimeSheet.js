/**
 * CinemaShowtimeSheet
 *
 * Bottom sheet that displays all showtimes for a cinema-group event.
 * Shows date tabs → format rows → time pills.
 * Tapping a time pill opens the cinema's ticket URL.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Pressable, Platform, Animated, Linking, Alert,
} from 'react-native';
import { X, Film, MapPin, Ticket } from 'lucide-react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import colors from '../theme/colors';
import { getCinemaSchedule, formatScheduleDate } from '../utils/cinemaGrouping';

dayjs.locale('es');

const CINE_BLUE = colors.pinCine;          // '#3B52D8'
const CINE_LIGHT = 'rgba(59, 82, 216, 0.15)';
const CINE_BORDER = 'rgba(59, 82, 216, 0.3)';

export default function CinemaShowtimeSheet({ group, visible, onClose }) {
  const translateY = useRef(new Animated.Value(400)).current;
  const [selectedDate, setSelectedDate] = useState(null);

  const schedule = getCinemaSchedule(group?.showtimes || [], 7);

  useEffect(() => {
    if (visible) {
      if (schedule.length > 0) setSelectedDate(schedule[0].date);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.spring(translateY, {
        toValue: 400,
        useNativeDriver: true,
        stiffness: 250,
        damping: 28,
        mass: 0.8,
      }).start();
      // Reset date selection after close animation
      const t = setTimeout(() => setSelectedDate(null), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!group) return null;

  const selectedDayData = schedule.find((s) => s.date === selectedDate);

  const openTickets = (url) => {
    const target = url || group.url;
    if (!target) return;
    Linking.openURL(target).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el enlace de tickets.')
    );
  };

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
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Header: movie title + cinema + close button */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Film size={18} color={CINE_BLUE} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.movieTitle} numberOfLines={2}>{group.title}</Text>
            <View style={styles.venueRow}>
              <MapPin size={11} color={colors.textDim} style={{ marginRight: 3 }} />
              <Text style={styles.venueText} numberOfLines={1}>
                {group.venueName || group.location}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <X size={18} color={colors.textDim} />
          </TouchableOpacity>
        </View>

        {schedule.length === 0 ? (
          <Text style={styles.noSchedule}>Sin funciones disponibles</Text>
        ) : (
          <>
            {/* Date tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateTabs}
            >
              {schedule.map(({ date }) => {
                const active = selectedDate === date;
                return (
                  <TouchableOpacity
                    key={date}
                    style={[styles.dateTab, active && styles.dateTabActive]}
                    onPress={() => setSelectedDate(date)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dateTabText, active && styles.dateTabTextActive]}>
                      {formatScheduleDate(date)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Showtimes for selected date */}
            <ScrollView
              style={styles.showtimesArea}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.showtimesContent}
            >
              {selectedDayData?.formats.map(({ format, times }) => (
                <View key={format} style={styles.formatBlock}>
                  <Text style={styles.formatLabel}>{format}</Text>
                  <View style={styles.timePillRow}>
                    {times.map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={styles.timePill}
                        onPress={() => openTickets(group.url)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.timePillText}>{time}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Buy tickets CTA */}
            {!!group.url && (
              <TouchableOpacity
                style={styles.buyBtn}
                onPress={() => openTickets()}
                activeOpacity={0.85}
              >
                <Ticket size={15} color="#fff" style={{ marginRight: 7 }} />
                <Text style={styles.buyBtnText}>Comprar tickets</Text>
              </TouchableOpacity>
            )}
          </>
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
    maxHeight: '75%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 24 },
      web: { boxShadow: '0 -4px 28px rgba(0,0,0,0.5)' },
    }),
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconWrap: {
    width: 36, height: 36,
    borderRadius: 10,
    backgroundColor: CINE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: CINE_BORDER,
  },
  headerText: { flex: 1 },
  movieTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    lineHeight: 22,
    marginBottom: 4,
  },
  venueRow: { flexDirection: 'row', alignItems: 'center' },
  venueText: {
    color: colors.textDim,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    flex: 1,
  },
  closeBtn: { padding: 4, marginLeft: 8, flexShrink: 0 },

  // ── Date tabs ────────────────────────────────────────────────────────────────
  dateTabs: {
    paddingBottom: 12,
    gap: 8,
  },
  dateTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.glassLight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  dateTabActive: {
    backgroundColor: CINE_BLUE,
    borderColor: CINE_BLUE,
  },
  dateTabText: {
    color: colors.textDim,
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    textTransform: 'capitalize',
  },
  dateTabTextActive: {
    color: '#fff',
    fontFamily: 'Outfit_600SemiBold',
  },

  // ── Showtimes ────────────────────────────────────────────────────────────────
  showtimesArea: { flex: 1 },
  showtimesContent: { paddingBottom: 8 },
  formatBlock: { marginBottom: 16 },
  formatLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  timePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: CINE_LIGHT,
    borderWidth: 1,
    borderColor: CINE_BORDER,
  },
  timePillText: {
    color: '#A0B4FF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },

  // ── CTA ──────────────────────────────────────────────────────────────────────
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CINE_BLUE,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  buyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
  },

  noSchedule: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
});
