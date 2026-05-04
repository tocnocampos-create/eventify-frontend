/**
 * AlaireLibreSheet
 *
 * Bottom sheet for outdoor venues (parques/cerros).
 * Includes an inline date strip + time picker so there is NO nested Modal —
 * the native date picker (react-native-modal-datetime-picker) cannot be shown
 * on top of another Modal on iOS, so all selection happens inline.
 *
 * Flow:
 *  1. Tap day pill  →  time row appears
 *  2. Adjust hour with ← →, tap minute pill (optional)
 *  3. "Guardar en agenda" → POST /me/venue-visits → success state → auto-close
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Platform,
  Modal, Pressable, Alert, ScrollView,
} from 'react-native';
import {
  TreePine, Clock, X, MapPin, Plus, Check, CalendarPlus,
  ChevronLeft, ChevronRight,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/es';
import colors from '../theme/colors';
import { useSaveVenueVisit } from '../hooks/useUserPreferences';

dayjs.extend(isoWeek);
dayjs.locale('es');

const GREEN       = '#2D7D46';
const GREEN_LIGHT = 'rgba(45, 125, 70, 0.15)';
const GREEN_BORDER = 'rgba(45, 125, 70, 0.3)';
const MINUTES     = [0, 15, 30, 45];

function buildDays(n = 14) {
  return Array.from({ length: n }, (_, i) => dayjs().add(i, 'day'));
}

function dayLabel(d, index) {
  if (index === 0) return 'Hoy';
  if (index === 1) return 'Mañana';
  return d.format('ddd D'); // "mié 7"
}

export default function AlaireLibreSheet({ venue, visible, onClose }) {
  const translateY = useRef(new Animated.Value(400)).current;

  // Inline picker state — no external Modal needed
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [showTime, setShowTime]                 = useState(false);
  const [hour, setHour]                         = useState(10);
  const [minute, setMinute]                     = useState(null); // null = no time chosen

  const [saved, setSaved]   = useState(false);
  const { mutate: saveVisit, isPending } = useSaveVenueVisit();

  // Fresh day list each time the sheet opens
  const [days, setDays] = useState(() => buildDays(14));

  useEffect(() => {
    if (visible) {
      setDays(buildDays(14));
      setSelectedDayIndex(null);
      setShowTime(false);
      setHour(10);
      setMinute(null);
      setSaved(false);
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
    }
  }, [visible]);

  if (!venue) return null;

  // Today's opening hours
  const todayDow      = dayjs().isoWeekday();
  const todaySchedule = venue.schedule?.find((s) => s.day_of_week === todayDow);
  const isClosed      = !todaySchedule || todaySchedule.opens_at === '-';
  const scheduleText  = isClosed
    ? 'Cerrado hoy'
    : `${todaySchedule.opens_at} – ${todaySchedule.closes_at}`;

  const selectedDay = selectedDayIndex !== null ? days[selectedDayIndex] : null;

  const handleSelectDay = (index) => {
    setSelectedDayIndex(index);
    setShowTime(true);
  };

  const handleSave = () => {
    if (!selectedDay) return;
    const timeStr = minute !== null
      ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      : null;

    saveVisit(
      {
        venue_name:      venue.name,
        venue_type:      venue.type  || null,
        venue_city:      venue.city  || null,
        scheduled_date:  selectedDay.format('YYYY-MM-DD'),
        scheduled_time:  timeStr,
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => { setSaved(false); onClose(); }, 1400);
        },
        onError: () => {
          Alert.alert('Error', 'No se pudo guardar la visita. Intenta de nuevo.');
        },
      },
    );
  };

  const canSave = selectedDay !== null && !isPending && !saved;

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

        {/* ── Header ─────────────────────────────────────────────── */}
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

        {/* ── Info rows ──────────────────────────────────────────── */}
        <View style={styles.row}>
          <Clock size={15} color={isClosed ? colors.textDim : GREEN} style={styles.rowIcon} />
          <Text style={[styles.rowText, isClosed && styles.rowTextDim]}>
            {scheduleText}
          </Text>
        </View>
        {!!venue.city && (
          <View style={styles.row}>
            <MapPin size={15} color={colors.textDim} style={styles.rowIcon} />
            <Text style={styles.rowTextDim}>{venue.city}</Text>
          </View>
        )}

        {/* ── Agenda section ─────────────────────────────────────── */}
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>¿Cuándo vas?</Text>

        {/* Inline day strip — no Modal, no native picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStrip}
          keyboardShouldPersistTaps="handled"
        >
          {days.map((d, i) => {
            const active = selectedDayIndex === i;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayPill, active && styles.dayPillActive]}
                onPress={() => handleSelectDay(i)}
                activeOpacity={0.75}
              >
                <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                  {dayLabel(d, i)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Inline time picker — appears once a day is chosen */}
        {showTime && (
          <View style={styles.timePicker}>
            <Text style={styles.sectionLabel}>Hora (opcional)</Text>
            <View style={styles.timeRow}>

              {/* Hour stepper: ← 10 → */}
              <View style={styles.stepper}>
                <TouchableOpacity
                  onPress={() => setHour((h) => Math.max(0, h - 1))}
                  hitSlop={10}
                  style={styles.stepBtn}
                >
                  <ChevronLeft size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.stepValue}>{String(hour).padStart(2, '0')}</Text>
                <TouchableOpacity
                  onPress={() => setHour((h) => Math.min(23, h + 1))}
                  hitSlop={10}
                  style={styles.stepBtn}
                >
                  <ChevronRight size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.timeSep}>:</Text>

              {/* Minute pills: 00 15 30 45 */}
              <View style={styles.minutePills}>
                {MINUTES.map((m) => {
                  const active = minute === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.minPill, active && styles.minPillActive]}
                      onPress={() => setMinute(active ? null : m)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.minPillText, active && styles.minPillTextActive]}>
                        {String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ── Save button ────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.agendaBtn,
            !canSave && !saved && styles.agendaBtnDim,
            saved && styles.agendaBtnSaved,
          ]}
          onPress={canSave ? handleSave : undefined}
          activeOpacity={canSave ? 0.8 : 1}
          disabled={!canSave && !saved}
        >
          {saved ? (
            <>
              <Check size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.agendaBtnText}>¡Guardado en tu agenda!</Text>
            </>
          ) : selectedDay ? (
            <>
              <CalendarPlus size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.agendaBtnText}>
                {isPending ? 'Guardando…' : 'Guardar en agenda'}
              </Text>
            </>
          ) : (
            <>
              <Plus size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.agendaBtnText}>Agregar a mi agenda</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 24 },
      web:     { boxShadow: '0 -4px 28px rgba(0,0,0,0.5)' },
    }),
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // ── Header ────────────────────────────────────────────────────
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, flexShrink: 0,
    borderWidth: 1, borderColor: GREEN_BORDER,
  },
  headerText: { flex: 1 },
  name: {
    color: colors.text, fontSize: 16, fontFamily: 'Outfit_600SemiBold',
    lineHeight: 22, marginBottom: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start', backgroundColor: GREEN_LIGHT,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: GREEN_BORDER,
  },
  typeText: { color: '#4ADE80', fontSize: 11, fontFamily: 'Outfit_500Medium' },
  closeBtn: { padding: 4, marginLeft: 8, flexShrink: 0 },

  // ── Info rows ─────────────────────────────────────────────────
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rowIcon: { marginRight: 8 },
  rowText: { color: colors.text, fontSize: 14, fontFamily: 'Outfit_400Regular' },
  rowTextDim: { color: colors.textDim, fontSize: 14, fontFamily: 'Outfit_400Regular' },

  // ── Agenda ────────────────────────────────────────────────────
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 11, fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10,
  },

  // Day strip
  dayStrip: { paddingBottom: 4, gap: 8 },
  dayPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.glassLight,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  dayPillActive: { backgroundColor: GREEN, borderColor: GREEN },
  dayPillText: {
    color: colors.textDim, fontSize: 13,
    fontFamily: 'Outfit_500Medium', textTransform: 'capitalize',
  },
  dayPillTextActive: { color: '#fff', fontFamily: 'Outfit_600SemiBold' },

  // Time picker
  timePicker: { marginTop: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.glassLight,
    borderRadius: 10, paddingHorizontal: 4, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.glassBorder,
    gap: 4,
  },
  stepBtn: { padding: 4 },
  stepValue: {
    color: colors.text, fontSize: 22, fontFamily: 'Outfit_700Bold',
    minWidth: 34, textAlign: 'center',
  },
  timeSep: {
    color: colors.textDim, fontSize: 22, fontFamily: 'Outfit_700Bold',
  },
  minutePills: { flexDirection: 'row', gap: 6 },
  minPill: {
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.glassLight,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  minPillActive: { backgroundColor: GREEN, borderColor: GREEN },
  minPillText: { color: colors.textDim, fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  minPillTextActive: { color: '#fff' },

  // Save button
  agendaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GREEN, paddingVertical: 13, borderRadius: 12,
    marginTop: 18,
  },
  agendaBtnDim: { opacity: 0.45 },
  agendaBtnSaved: { backgroundColor: '#1a5c30' },
  agendaBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
});
