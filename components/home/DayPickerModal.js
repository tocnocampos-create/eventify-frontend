import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet,
  Dimensions, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import colors from '../../theme/colors';
import dayjs from 'dayjs';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CALENDAR_PAD = 20;
const CELL = (SCREEN_WIDTH - CALENDAR_PAD * 2) / 7;
const DAYS_HEADER = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const RANGE_BG = 'rgba(155, 93, 229, 0.12)';
const MONTHS_COUNT = 12;

/* ── helpers ──────────────────────────────────────────────── */

function buildMonths(n) {
  const today = dayjs();
  return Array.from({ length: n }, (_, i) => {
    const first = today.add(i, 'month').startOf('month');
    const total = first.daysInMonth();
    const dow = first.day(); // 0=Sun
    const off = dow === 0 ? 6 : dow - 1; // Monday-first
    const weeks = [];
    let row = Array(off).fill(null);
    for (let d = 1; d <= total; d++) {
      row.push(d);
      if (row.length === 7) { weeks.push(row); row = []; }
    }
    if (row.length) { while (row.length < 7) row.push(null); weeks.push(row); }
    return {
      key: first.format('YYYY-MM'),
      label: first.format('MMMM YYYY'),
      weeks,
    };
  });
}

function resolveQuick(id) {
  const t = dayjs();
  switch (id) {
    case 'today': return { s: t.format('YYYY-MM-DD'), e: null };
    case 'tomorrow': return { s: t.add(1, 'day').format('YYYY-MM-DD'), e: null };
    case 'weekend': {
      const d = t.day();
      const sat = d === 6 ? t : d === 0 ? t.add(6, 'day') : t.day(6);
      return { s: sat.format('YYYY-MM-DD'), e: sat.add(1, 'day').format('YYYY-MM-DD') };
    }
    case 'next-week': {
      const m = t.add(1, 'week').startOf('isoWeek');
      return { s: m.format('YYYY-MM-DD'), e: m.add(6, 'day').format('YYYY-MM-DD') };
    }
    default: return { s: null, e: null };
  }
}

function estimateMonthY(months, targetKey) {
  let y = 0;
  for (const m of months) {
    if (m.key === targetKey) break;
    y += 20 + 40 + m.weeks.length * CELL;
  }
  return y;
}

/* ── DayCell ──────────────────────────────────────────────── */

function DayCell({ day, monthKey, start, end, onPress }) {
  if (!day) return <View style={{ width: CELL, height: CELL }} />;

  const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
  const todayStr = dayjs().format('YYYY-MM-DD');
  const isToday = dateStr === todayStr;
  const isPast = dateStr < todayStr;
  const isStart = dateStr === start;
  const isEnd = dateStr === end;
  const hasRange = !!(start && end);
  const isSelected = isStart || isEnd;
  const isInRange = hasRange && dateStr > start && dateStr < end;

  const sz = CELL * 0.76;
  const stripH = sz;
  const stripY = (CELL - stripH) / 2;

  return (
    <TouchableOpacity
      onPress={() => !isPast && onPress(dateStr)}
      disabled={isPast}
      activeOpacity={0.5}
      style={{ width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' }}
    >
      {/* range strips */}
      {isStart && hasRange && (
        <View style={{
          position: 'absolute', top: stripY, height: stripH,
          left: CELL / 2, width: CELL / 2, backgroundColor: RANGE_BG,
        }} />
      )}
      {isEnd && hasRange && (
        <View style={{
          position: 'absolute', top: stripY, height: stripH,
          left: 0, width: CELL / 2, backgroundColor: RANGE_BG,
        }} />
      )}
      {isInRange && (
        <View style={{
          position: 'absolute', top: stripY, height: stripH,
          left: 0, width: CELL, backgroundColor: RANGE_BG,
        }} />
      )}

      {/* circle / number */}
      {isSelected ? (
        <LinearGradient
          colors={[colors.authGradientStart, colors.authGradientEnd]}
          style={{
            width: sz, height: sz, borderRadius: sz / 2,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={st.daySelected}>{day}</Text>
        </LinearGradient>
      ) : (
        <View style={{
          width: sz, height: sz, borderRadius: sz / 2,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={[
            st.dayNum,
            isPast && st.dayPast,
            isInRange && st.dayInRange,
            isToday && st.dayToday,
          ]}>{day}</Text>
          {isToday && (
            <View style={st.todayDot} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

/* ── MonthGrid ────────────────────────────────────────────── */

function MonthGrid({ month, start, end, onDayPress }) {
  return (
    <View style={st.monthWrap}>
      <Text style={st.monthLabel}>{month.label}</Text>
      {month.weeks.map((week, wi) => (
        <View key={wi} style={st.weekRow}>
          {week.map((day, di) => (
            <DayCell
              key={di}
              day={day}
              monthKey={month.key}
              start={start}
              end={end}
              onPress={onDayPress}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/* ── Main Component ───────────────────────────────────────── */

const QUICK_PILLS = [
  { id: 'today', label: 'Hoy' },
  { id: 'tomorrow', label: 'Mañana' },
  { id: 'weekend', label: 'Este finde' },
  { id: 'next-week', label: 'Próx. semana' },
];

export default function DayPickerModal({
  visible,
  selectedDays = [],
  currentDate,
  onClose,
  onApply,
}) {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [quickId, setQuickId] = useState(null);

  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeVal = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);

  const months = useMemo(() => buildMonths(MONTHS_COUNT), []);

  /* sync state when modal opens */
  useEffect(() => {
    if (!visible) return;

    if (selectedDays.length > 0) {
      const sorted = [...selectedDays].sort();
      setStart(sorted[0]);
      setEnd(sorted.length > 1 ? sorted[sorted.length - 1] : null);
    } else {
      setStart(null);
      setEnd(null);
    }
    setQuickId(null);

    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, damping: 24, stiffness: 260, useNativeDriver: true }),
      Animated.timing(fadeVal, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    // scroll to relevant month
    const targetDate = selectedDays.length > 0
      ? [...selectedDays].sort()[0]
      : (currentDate ? currentDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
    const targetMonth = targetDate.substring(0, 7);

    setTimeout(() => {
      const y = estimateMonthY(months, targetMonth);
      scrollRef.current?.scrollTo({ y, animated: false });
    }, 150);
  }, [visible]);

  /* ── handlers ── */

  const animateClose = useCallback((cb) => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeVal, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      if (cb) cb();
      else onClose();
    });
  }, [onClose]);

  const handleClose = useCallback(() => animateClose(), [animateClose]);

  const handleDayPress = useCallback((dateStr) => {
    setQuickId(null);

    if (!start || (start && end)) {
      setStart(dateStr);
      setEnd(null);
    } else {
      if (dateStr < start) {
        setEnd(start);
        setStart(dateStr);
      } else if (dateStr === start) {
        setEnd(null); // single-tap same day = keep single
      } else {
        setEnd(dateStr);
      }
    }
  }, [start, end]);

  const handleQuick = useCallback((id) => {
    if (quickId === id) {
      setQuickId(null);
      setStart(null);
      setEnd(null);
    } else {
      setQuickId(id);
      const { s, e } = resolveQuick(id);
      setStart(s);
      setEnd(e);
    }
  }, [quickId]);

  const handleClear = useCallback(() => {
    setStart(null);
    setEnd(null);
    setQuickId(null);
  }, []);

  const handleApply = useCallback(() => {
    if (!start) {
      animateClose(() => onApply([]));
      return;
    }
    const days = [];
    const s = dayjs(start);
    const e = end ? dayjs(end) : s;
    let d = s;
    while (d.isBefore(e) || d.isSame(e, 'day')) {
      days.push(d.format('YYYY-MM-DD'));
      d = d.add(1, 'day');
    }
    animateClose(() => onApply(days));
  }, [start, end, onApply, animateClose]);

  /* ── summary text ── */
  const summary = useMemo(() => {
    if (!start) return 'Selecciona fechas';
    if (!end) return dayjs(start).format('ddd DD MMM YYYY');
    return `${dayjs(start).format('DD MMM')} \u2192 ${dayjs(end).format('DD MMM YYYY')}`;
  }, [start, end]);

  /* ── render ── */

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[st.backdrop, { opacity: fadeVal }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>

      <Animated.View style={[st.sheet, { transform: [{ translateY: slideY }] }]}>
        <LinearGradient colors={[colors.authBg, colors.authBgDeep]} style={StyleSheet.absoluteFill} />

        {/* handle */}
        <View style={st.handleWrap}><View style={st.handle} /></View>

        {/* header */}
        <View style={st.header}>
          <View>
            <Text style={st.title}>{'\u00BF'}Cu{'\u00E1'}ndo?</Text>
            <Text style={st.subtitle}>{summary}</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={st.closeBtn}>
            <X size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* quick pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={st.pillScroll}
          contentContainerStyle={st.pillContent}
        >
          {QUICK_PILLS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[st.pill, quickId === p.id && st.pillOn]}
              onPress={() => handleQuick(p.id)}
            >
              <Text style={[st.pillText, quickId === p.id && st.pillTextOn]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* weekday header */}
        <View style={st.wdRow}>
          {DAYS_HEADER.map((d, i) => (
            <View key={i} style={{ width: CELL, alignItems: 'center' }}>
              <Text style={st.wdText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* calendar */}
        <ScrollView
          ref={scrollRef}
          style={st.calScroll}
          showsVerticalScrollIndicator={false}
        >
          {months.map((m) => (
            <MonthGrid
              key={m.key}
              month={m}
              start={start}
              end={end}
              onDayPress={handleDayPress}
            />
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* footer */}
        <View style={st.footer}>
          <TouchableOpacity style={st.clearBtn} onPress={handleClear}>
            <Text style={st.clearText}>Limpiar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleApply}>
            <LinearGradient
              colors={start ? [colors.authGradientStart, colors.authGradientEnd] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
              style={st.applyBtn}
            >
              <Text style={[st.applyText, !start && { opacity: 0.4 }]}>Aplicar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

/* ── styles ────────────────────────────────────────────────── */

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.88,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  /* header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    color: '#fff', fontSize: 24, fontFamily: 'Outfit_700Bold',
  },
  subtitle: {
    color: colors.primary, fontSize: 13,
    fontFamily: 'Outfit_500Medium', marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
  },

  /* quick pills */
  pillScroll: { maxHeight: 42, marginBottom: 10 },
  pillContent: { paddingHorizontal: 20, gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  pillOn: {
    borderColor: colors.authGradientStart,
    backgroundColor: 'rgba(155, 93, 229, 0.18)',
  },
  pillText: {
    color: colors.textDim, fontSize: 13, fontFamily: 'Outfit_500Medium',
  },
  pillTextOn: {
    color: '#fff', fontFamily: 'Outfit_600SemiBold',
  },

  /* weekday row */
  wdRow: {
    flexDirection: 'row',
    paddingHorizontal: CALENDAR_PAD,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  wdText: {
    color: 'rgba(255,255,255,0.35)', fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },

  /* calendar scroll */
  calScroll: { flex: 1 },

  /* month */
  monthWrap: { paddingTop: 20, paddingHorizontal: CALENDAR_PAD },
  monthLabel: {
    color: '#fff', fontSize: 16, fontFamily: 'Outfit_700Bold',
    textTransform: 'capitalize', marginBottom: 12,
  },
  weekRow: { flexDirection: 'row' },

  /* day cell text */
  dayNum: {
    fontSize: 14, fontFamily: 'Outfit_400Regular',
    color: 'rgba(255,255,255,0.85)',
  },
  dayPast: { color: 'rgba(255,255,255,0.18)' },
  dayInRange: { color: '#fff', fontFamily: 'Outfit_500Medium' },
  dayToday: { fontFamily: 'Outfit_700Bold', color: '#fff' },
  daySelected: {
    color: '#fff', fontSize: 14, fontFamily: 'Outfit_700Bold',
  },
  todayDot: {
    position: 'absolute', bottom: 2,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.primary,
  },

  /* footer */
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  clearBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  clearText: {
    color: '#fff', fontSize: 15, fontFamily: 'Outfit_600SemiBold',
  },
  applyBtn: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 12, alignItems: 'center',
  },
  applyText: {
    color: '#fff', fontSize: 15, fontFamily: 'Outfit_700Bold',
  },
});
