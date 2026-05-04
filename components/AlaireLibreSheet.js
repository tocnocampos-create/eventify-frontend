import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Platform, Modal, Pressable, Alert,
} from 'react-native';
import { TreePine, Clock, X, MapPin, Plus, Check, CalendarPlus } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/es';
import colors from '../theme/colors';
import { useSaveVenueVisit } from '../hooks/useUserPreferences';

dayjs.extend(isoWeek);
dayjs.locale('es');

const GREEN = '#2D7D46';
const GREEN_LIGHT = 'rgba(45, 125, 70, 0.15)';
const GREEN_BORDER = 'rgba(45, 125, 70, 0.3)';

export default function AlaireLibreSheet({ venue, visible, onClose }) {
  const translateY = useRef(new Animated.Value(200)).current;
  const [pickerMode, setPickerMode] = useState(null); // 'date' | 'time' | null
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [saved, setSaved] = useState(false);

  const { mutate: saveVisit, isPending } = useSaveVenueVisit();

  useEffect(() => {
    if (visible) {
      setSaved(false);
      setSelectedDate(null);
      setSelectedTime(null);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.spring(translateY, {
        toValue: 200,
        useNativeDriver: true,
        stiffness: 250,
        damping: 28,
        mass: 0.8,
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

  const handleDateConfirm = (date) => {
    setPickerMode(null);
    setSelectedDate(date);
    // Auto-open time picker after picking date
    setTimeout(() => setPickerMode('time'), 300);
  };

  const handleTimeConfirm = (time) => {
    setPickerMode(null);
    setSelectedTime(time);
  };

  const handleAddToAgenda = () => {
    if (!selectedDate) {
      setPickerMode('date');
      return;
    }
    const payload = {
      venue_name: venue.name,
      venue_type: venue.type || null,
      venue_city: venue.city || null,
      scheduled_date: dayjs(selectedDate).format('YYYY-MM-DD'),
      scheduled_time: selectedTime ? dayjs(selectedTime).format('HH:mm') : null,
    };
    saveVisit(payload, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          onClose();
        }, 1400);
      },
      onError: () => {
        Alert.alert('Error', 'No se pudo guardar la visita. Intenta de nuevo.');
      },
    });
  };

  const dateLabel = selectedDate ? dayjs(selectedDate).format('D [de] MMMM') : null;
  const timeLabel = selectedTime ? dayjs(selectedTime).format('HH:mm') : null;

  return (
    <>
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

          {/* ── Agenda section ── */}
          <View style={styles.divider} />

          {/* Date/time selection chips */}
          {(selectedDate || selectedTime) && (
            <View style={styles.chipRow}>
              {selectedDate && (
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => setPickerMode('date')}
                  activeOpacity={0.75}
                >
                  <Text style={styles.chipText}>{dateLabel}</Text>
                </TouchableOpacity>
              )}
              {selectedTime && (
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => setPickerMode('time')}
                  activeOpacity={0.75}
                >
                  <Text style={styles.chipText}>{timeLabel}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Add to agenda button */}
          <TouchableOpacity
            style={[styles.agendaBtn, saved && styles.agendaBtnSaved, isPending && styles.agendaBtnDisabled]}
            onPress={handleAddToAgenda}
            activeOpacity={0.8}
            disabled={isPending || saved}
          >
            {saved ? (
              <>
                <Check size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.agendaBtnText}>¡Guardado en tu agenda!</Text>
              </>
            ) : selectedDate ? (
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

      {/* Date picker */}
      <DateTimePickerModal
        isVisible={pickerMode === 'date'}
        mode="date"
        minimumDate={new Date()}
        locale="es_CL"
        onConfirm={handleDateConfirm}
        onCancel={() => setPickerMode(null)}
        confirmTextIOS="Confirmar"
        cancelTextIOS="Cancelar"
      />

      {/* Time picker */}
      <DateTimePickerModal
        isVisible={pickerMode === 'time'}
        mode="time"
        locale="es_CL"
        is24Hour
        onConfirm={handleTimeConfirm}
        onCancel={() => setPickerMode(null)}
        confirmTextIOS="Confirmar"
        cancelTextIOS="Cancelar"
      />
    </>
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
    borderWidth: 1,
    borderColor: GREEN_BORDER,
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
    borderColor: GREEN_BORDER,
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

  // ── Agenda ────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: GREEN_LIGHT,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
  },
  chipText: {
    color: '#4ADE80',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    textTransform: 'capitalize',
  },
  agendaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
    paddingVertical: 13,
    borderRadius: 12,
  },
  agendaBtnSaved: {
    backgroundColor: '#1a5c30',
  },
  agendaBtnDisabled: {
    opacity: 0.6,
  },
  agendaBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
});
