import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Modal, Platform, useWindowDimensions,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOUR_KEY = 'onboarding_tour_complete';
const CARD_H = 152;
const ARROW_H = 14;

// ─── Persistence ──────────────────────────────────────────────────────────────
async function getTourDone() {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(TOUR_KEY) === '1';
    return (await SecureStore.getItemAsync(TOUR_KEY)) === '1';
  } catch { return false; }
}
async function markTourDone() {
  try {
    if (Platform.OS === 'web') { localStorage.setItem(TOUR_KEY, '1'); return; }
    await SecureStore.setItemAsync(TOUR_KEY, '1');
  } catch { /* best-effort */ }
}

// ─── Step definitions ─────────────────────────────────────────────────────────
// target       → { x, y, w, h, radius } in screen coords; null = no cutout
// lightOverlay → use 0.50 opacity so live map shows through
// bottomTooltip→ pin tooltip at bottom center; arrow points up toward map
// fakePin      → { cx, cy } render decorative cluster pin instead of cutout
function buildSteps(w, h, insets) {
  const tabBarH = 72;
  const tabBarBottom = Math.max(insets.bottom, 12);
  const tabTop = h - tabBarH - tabBarBottom;

  // Cycle-overlay button (MapPin/Footprints/TreePine) is 2nd from right in search bar.
  // Search bar: top = insets.top+8, paddingH = 12.
  // Button: 32×32 (padding 6 + icon 20 + padding 6), marginLeft 10.
  // Position from screen right: 15(bar margin)+12(pad)+32(filter)+10(gap) = 69 from right.
  const cycleBtn = { x: w - 109, y: insets.top + 10, w: 44, h: 44, radius: 12 };

  return [
    {
      id: 'map',
      title: 'Explora eventos en tiempo real',
      subtitle: 'El mapa muestra todos los eventos culturales de Santiago. Navégalo libremente.',
      target: null,
      lightOverlay: true,
      bottomTooltip: true,
      arrowDir: 'up',
    },
    {
      id: 'date',
      title: 'Filtra por fecha',
      subtitle: 'Filtra por fecha para ver qué pasa hoy o este fin de semana.',
      target: { x: 15, y: insets.top + 58, w: w - 30, h: 43, radius: 22 },
      arrowDir: 'up',
    },
    {
      id: 'categories',
      title: 'Filtra por categoría',
      subtitle: 'Música, teatro, cine y más. Toca el ícono de filtro en la barra de búsqueda.',
      target: { x: w - 62, y: insets.top + 9, w: 47, h: 47, radius: 14 },
      arrowDir: 'up',
    },
    {
      id: 'overlay',
      title: 'Descubre Santiago',
      subtitle: 'Activa los barrios patrimoniales o los parques y cerros al aire libre de la ciudad.',
      target: cycleBtn,
      arrowDir: 'up',
    },
    {
      id: 'pin',
      title: 'Toca cualquier pin',
      subtitle: 'Cada pin del mapa es un evento o venue. Tócalo para ver todos los detalles.',
      target: null,
      fakePin: { cx: w / 2, cy: h * 0.46 },
      arrowDir: 'down',
    },
    {
      id: 'carousel',
      title: 'Eventos cerca de ti',
      subtitle: 'Desliza horizontalmente para ver todos los eventos del día.',
      target: { x: 12, y: h - 196 - tabBarBottom, w: w - 24, h: 156, radius: 16 },
      arrowDir: 'down',
    },
    {
      id: 'tabs',
      title: 'Navega por la app',
      subtitle: 'Explora, busca y guarda tus eventos favoritos desde el menú inferior.',
      target: { x: 16, y: tabTop - 8, w: w - 32, h: tabBarH + 16, radius: 28 },
      arrowDir: 'down',
    },
    {
      id: 'finish',
      title: '¡Listo! Descubre lo mejor de Santiago',
      subtitle: 'Ya conoces lo esencial. ¡Empieza a explorar eventos culturales cerca de ti!',
      target: null,
      arrowDir: null,
      isFinal: true,
    },
  ];
}

// Target for steps with no cutout — collapses to a point at screen center.
// With cutoutW/H = 0: top+bottom rects together cover the full screen,
// left/right rects have zero height and are invisible.
const nullTarget = (w, h) => ({ x: w / 2, y: h / 2, w: 0, h: 0, r: 0 });

// ─── Animated cutout overlay ──────────────────────────────────────────────────
// All props are Animated.Values (JS driver). bgColor is an interpolated string.
function AnimatedCutoutOverlay({ cx, cy, cw, ch, cr, bottomTop, rightLeft, bgColor }) {
  return (
    <>
      {/* Top */}
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: cy, backgroundColor: bgColor }} />
      {/* Bottom */}
      <Animated.View style={{ position: 'absolute', top: bottomTop, left: 0, right: 0, bottom: 0, backgroundColor: bgColor }} />
      {/* Left */}
      <Animated.View style={{ position: 'absolute', top: cy, left: 0, width: cx, height: ch, backgroundColor: bgColor }} />
      {/* Right */}
      <Animated.View style={{ position: 'absolute', top: cy, left: rightLeft, right: 0, height: ch, backgroundColor: bgColor }} />
      {/* Highlight ring */}
      <Animated.View style={{
        position: 'absolute', top: cy, left: cx, width: cw, height: ch, borderRadius: cr,
        borderWidth: 2.5, borderColor: '#BFA0FF',
        shadowColor: '#BFA0FF', shadowOpacity: 0.75, shadowRadius: 14, elevation: 8,
      }} />
    </>
  );
}

// ─── Fake map pin (Música cluster style) ─────────────────────────────────────
const PIN_COLOR = '#9B5DE5';
const PIN_BODY_SIZE = 38;
const PIN_BODY_RADIUS = PIN_BODY_SIZE / 2;

function FakeMapPin({ cx, cy }) {
  return (
    <View style={{ position: 'absolute', left: cx - 26, top: cy - PIN_BODY_RADIUS, width: 52, alignItems: 'center' }}>
      <View style={{ position: 'absolute', top: -5, width: 48, height: 48, borderRadius: 24, backgroundColor: PIN_COLOR + '28' }} />
      <View style={{
        width: PIN_BODY_SIZE, height: PIN_BODY_SIZE, borderRadius: PIN_BODY_RADIUS,
        backgroundColor: PIN_COLOR, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.85)', overflow: 'hidden',
        shadowColor: PIN_COLOR, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.65, shadowRadius: 14, elevation: 12,
      }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: 'rgba(255,255,255,0.20)', borderTopLeftRadius: PIN_BODY_RADIUS, borderTopRightRadius: PIN_BODY_RADIUS }} />
        <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: 'Outfit_700Bold', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, zIndex: 1 }}>5</Text>
      </View>
      <View style={{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: PIN_COLOR, marginTop: -3 }} />
      <View style={{ width: 14, height: 4, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.18)', marginTop: 1 }} />
    </View>
  );
}

// ─── Spring config ────────────────────────────────────────────────────────────
const CUTOUT_SPRING = { damping: 15, stiffness: 120, useNativeDriver: false };
const TOOLTIP_SPRING = { damping: 15, stiffness: 120, useNativeDriver: true };

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingTour() {
  const { width: w, height: h } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  // ── Animated values ───────────────────────────────────────────────────────
  const overlayFade   = useRef(new Animated.Value(0)).current;
  // Cutout position (JS driver — layout props)
  const cutoutX       = useRef(new Animated.Value(w / 2)).current;
  const cutoutY       = useRef(new Animated.Value(h / 2)).current;
  const cutoutW       = useRef(new Animated.Value(0)).current;
  const cutoutH       = useRef(new Animated.Value(0)).current;
  const cutoutR       = useRef(new Animated.Value(0)).current;
  // Derived values (stable refs — Animated.add references the same underlying values)
  const cutoutBottomTop  = useRef(Animated.add(cutoutY, cutoutH)).current;
  const cutoutRightLeft  = useRef(Animated.add(cutoutX, cutoutW)).current;
  // Overlay color (0.50 light → 0.80 dark)
  const bgOpacity     = useRef(new Animated.Value(0.50)).current;
  const bgColor       = useRef(bgOpacity.interpolate({
    inputRange: [0.50, 0.80],
    outputRange: ['rgba(0,0,0,0.50)', 'rgba(0,0,0,0.80)'],
    extrapolate: 'clamp',
  })).current;
  // Tooltip (native driver)
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipTransY  = useRef(new Animated.Value(10)).current;

  const steps = useMemo(() => buildSteps(w, h, insets), [w, h, insets.top, insets.bottom]);
  const current = steps[step];

  // ── Mount: fade in overlay + slide in first tooltip ───────────────────────
  useEffect(() => {
    getTourDone().then((done) => {
      if (!done) {
        setVisible(true);
        tooltipTransY.setValue(10);
        Animated.parallel([
          Animated.timing(overlayFade, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(280),
            Animated.parallel([
              Animated.timing(tooltipOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
              Animated.spring(tooltipTransY, { toValue: 0, ...TOOLTIP_SPRING }),
            ]),
          ]),
        ]).start();
      }
    });
  }, []);

  // ── Tooltip geometry ──────────────────────────────────────────────────────
  const TOOLTIP_W = Math.min(w - 40, 320);
  let tooltipLeft, tooltipTop, arrowOffsetLeft;

  if (current.isFinal) {
    tooltipLeft = (w - TOOLTIP_W) / 2;
    tooltipTop = h / 2 - CARD_H / 2 - 20;
    arrowOffsetLeft = null;
  } else if (current.bottomTooltip) {
    const tabBarBottom = Math.max(insets.bottom, 12);
    tooltipLeft = (w - TOOLTIP_W) / 2;
    tooltipTop = h - 200 - tabBarBottom - CARD_H - ARROW_H - 12;
    tooltipTop = Math.max(insets.top + 8, tooltipTop);
    arrowOffsetLeft = TOOLTIP_W / 2 - ARROW_H;
  } else if (current.fakePin) {
    const { cx, cy } = current.fakePin;
    tooltipLeft = Math.max(20, Math.min(w - TOOLTIP_W - 20, cx - TOOLTIP_W / 2));
    arrowOffsetLeft = Math.max(16, Math.min(TOOLTIP_W - 36, cx - tooltipLeft - ARROW_H));
    tooltipTop = cy - PIN_BODY_RADIUS - CARD_H - ARROW_H - 10;
    tooltipTop = Math.max(insets.top + 8, Math.min(h - CARD_H - 40, tooltipTop));
  } else if (current.target) {
    const { x: tx, y: ty, w: tw, h: th } = current.target;
    const targetCX = tx + tw / 2;
    tooltipLeft = Math.max(20, Math.min(w - TOOLTIP_W - 20, targetCX - TOOLTIP_W / 2));
    arrowOffsetLeft = Math.max(16, Math.min(TOOLTIP_W - 36, targetCX - tooltipLeft - ARROW_H));
    tooltipTop = current.arrowDir === 'up' ? ty + th + ARROW_H + 4 : ty - CARD_H - ARROW_H - 4;
    tooltipTop = Math.max(insets.top + 8, Math.min(h - CARD_H - 40, tooltipTop));
  } else {
    tooltipLeft = (w - TOOLTIP_W) / 2;
    tooltipTop = h / 2 - CARD_H / 2 - 20;
    arrowOffsetLeft = null;
  }

  // ── Step advance with spring cutout + slide tooltip ───────────────────────
  const advanceStep = useCallback(() => {
    const nextIdx = step + 1;
    const nextStep = steps[nextIdx];
    if (!nextStep) return;

    const nt = nextStep.target
      ? { x: nextStep.target.x, y: nextStep.target.y, w: nextStep.target.w, h: nextStep.target.h, r: nextStep.target.radius }
      : nullTarget(w, h);
    const nextBg = nextStep.lightOverlay ? 0.50 : 0.80;

    // 1. Fade out tooltip
    Animated.timing(tooltipOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setStep(nextIdx);

      // 2. Spring cutout to new position (JS driver)
      Animated.parallel([
        Animated.spring(cutoutX, { toValue: nt.x, ...CUTOUT_SPRING }),
        Animated.spring(cutoutY, { toValue: nt.y, ...CUTOUT_SPRING }),
        Animated.spring(cutoutW, { toValue: nt.w, ...CUTOUT_SPRING }),
        Animated.spring(cutoutH, { toValue: nt.h, ...CUTOUT_SPRING }),
        Animated.spring(cutoutR, { toValue: nt.r, ...CUTOUT_SPRING }),
        Animated.timing(bgOpacity, { toValue: nextBg, duration: 300, useNativeDriver: false }),
      ]).start();

      // 3. Slide in new tooltip (native driver)
      tooltipTransY.setValue(10);
      Animated.parallel([
        Animated.timing(tooltipOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(tooltipTransY, { toValue: 0, ...TOOLTIP_SPRING }),
      ]).start();
    });
  }, [step, steps, w, h]);

  const completeTour = useCallback(() => {
    markTourDone();
    Animated.timing(overlayFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setVisible(false);
    });
  }, [overlayFade]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent presentationStyle="overFullScreen">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: overlayFade }]}>

        {/* Animated cutout overlay */}
        <AnimatedCutoutOverlay
          cx={cutoutX} cy={cutoutY} cw={cutoutW} ch={cutoutH} cr={cutoutR}
          bottomTop={cutoutBottomTop} rightLeft={cutoutRightLeft}
          bgColor={bgColor}
        />

        {/* Fake pin — pin step only */}
        {current.fakePin && (
          <Animated.View style={{ opacity: tooltipOpacity }}>
            <FakeMapPin cx={current.fakePin.cx} cy={current.fakePin.cy} />
          </Animated.View>
        )}

        {/* Tooltip card with fade + slide-up */}
        <Animated.View style={[
          styles.tooltipWrapper,
          {
            opacity: tooltipOpacity,
            transform: [{ translateY: tooltipTransY }],
            top: tooltipTop,
            left: tooltipLeft,
            width: TOOLTIP_W,
          },
        ]}>
          {!current.isFinal && current.arrowDir === 'up' && (
            <View style={[styles.arrowUp, arrowOffsetLeft != null && { marginLeft: arrowOffsetLeft }]} />
          )}

          <View style={styles.card}>
            <View style={styles.accentBar} />
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.subtitle}>{current.subtitle}</Text>

            <View style={styles.footer}>
              {!current.isFinal ? (
                <TouchableOpacity onPress={completeTour} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.skipText}>Saltar</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.footerSpacer} />
              )}

              <View style={styles.dotsRow}>
                {steps.map((_, i) => (
                  <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
                ))}
              </View>

              <TouchableOpacity
                onPress={current.isFinal ? completeTour : advanceStep}
                style={styles.nextBtn}
                activeOpacity={0.82}
              >
                <Text style={styles.nextText}>
                  {current.isFinal ? 'Empezar' : 'Siguiente →'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {!current.isFinal && current.arrowDir === 'down' && (
            <View style={[styles.arrowDown, arrowOffsetLeft != null && { marginLeft: arrowOffsetLeft }]} />
          )}
        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_BG = '#12073A';
const ARROW_COLOR = '#12073A';

const styles = StyleSheet.create({
  tooltipWrapper: { position: 'absolute' },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(155, 93, 229, 0.25)',
    shadowColor: '#9B5DE5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 14,
  },
  accentBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: '#BFA0FF', borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  title: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#FFFFFF', marginBottom: 6 },
  subtitle: { fontSize: 13.5, fontFamily: 'Outfit_400Regular', color: 'rgba(191, 160, 255, 0.80)', lineHeight: 20, marginBottom: 14 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerSpacer: { width: 44 },
  skipText: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: 'rgba(255,255,255,0.38)', minWidth: 44 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  dotActive: { backgroundColor: '#BFA0FF', width: 18, borderRadius: 3 },
  nextBtn: { backgroundColor: '#9B5DE5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, minWidth: 44, alignItems: 'center' },
  nextText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  arrowUp: {
    width: 0, height: 0,
    borderLeftWidth: ARROW_H, borderRightWidth: ARROW_H, borderBottomWidth: ARROW_H,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: ARROW_COLOR,
    alignSelf: 'flex-start', marginBottom: -1,
  },
  arrowDown: {
    width: 0, height: 0,
    borderLeftWidth: ARROW_H, borderRightWidth: ARROW_H, borderTopWidth: ARROW_H,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: ARROW_COLOR,
    alignSelf: 'flex-start', marginTop: -1,
  },
});
