import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Modal, Platform, useWindowDimensions,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOUR_KEY = 'onboarding_tour_complete';
const CARD_H = 152; // estimated tooltip card height (excluding arrow)
const ARROW_H = 14;

// ─── Persistence helpers ──────────────────────────────────────────────────────
async function getTourDone() {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(TOUR_KEY) === '1';
    const val = await SecureStore.getItemAsync(TOUR_KEY);
    return val === '1';
  } catch {
    return false;
  }
}

async function markTourDone() {
  try {
    if (Platform.OS === 'web') { localStorage.setItem(TOUR_KEY, '1'); return; }
    await SecureStore.setItemAsync(TOUR_KEY, '1');
  } catch { /* best-effort */ }
}

// ─── Step definitions ─────────────────────────────────────────────────────────
// arrowDir: 'up'   → tooltip is BELOW the target, arrow points up toward it
// arrowDir: 'down' → tooltip is ABOVE the target, arrow points down toward it
// fakePin: { cx, cy } → render a decorative pin at that position instead of a cutout
function buildSteps(w, h, insets) {
  const tabBarH = 72;
  const tabBarBottom = Math.max(insets.bottom, 12);
  const tabTop = h - tabBarH - tabBarBottom;

  return [
    {
      id: 'map',
      title: 'Explora eventos en tiempo real',
      subtitle: 'El mapa muestra todos los eventos culturales de Santiago. Navégalo libremente.',
      target: { x: w * 0.15, y: insets.top + 130, w: w * 0.7, h: h * 0.26, radius: 16 },
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

// ─── Overlay helper ───────────────────────────────────────────────────────────
const DARK = 'rgba(0,0,0,0.80)';

function CutoutOverlay({ target }) {
  if (!target) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: DARK }]} />;
  }
  const { x, y, w, h, radius } = target;
  return (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: y, backgroundColor: DARK }} />
      <View style={{ position: 'absolute', top: y + h, left: 0, right: 0, bottom: 0, backgroundColor: DARK }} />
      <View style={{ position: 'absolute', top: y, left: 0, width: x, height: h, backgroundColor: DARK }} />
      <View style={{ position: 'absolute', top: y, left: x + w, right: 0, height: h, backgroundColor: DARK }} />
      <View style={{
        position: 'absolute', top: y, left: x, width: w, height: h,
        borderWidth: 2.5, borderColor: '#BFA0FF', borderRadius: radius,
        shadowColor: '#BFA0FF', shadowOpacity: 0.7, shadowRadius: 14,
        elevation: 8,
      }} />
    </>
  );
}

// ─── Fake map pin (Música cluster style) ─────────────────────────────────────
const PIN_COLOR = '#9B5DE5';
const PIN_BODY_SIZE = 38;
const PIN_BODY_RADIUS = PIN_BODY_SIZE / 2;

function FakeMapPin({ cx, cy }) {
  // cy = vertical center of the pin body circle
  return (
    <View style={{
      position: 'absolute',
      left: cx - 26,   // 52px wide container → center at cx
      top: cy - PIN_BODY_RADIUS,
      width: 52,
      alignItems: 'center',
    }}>
      {/* Glow ring */}
      <View style={{
        position: 'absolute',
        top: -5,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: PIN_COLOR + '28',
      }} />

      {/* Body */}
      <View style={{
        width: PIN_BODY_SIZE,
        height: PIN_BODY_SIZE,
        borderRadius: PIN_BODY_RADIUS,
        backgroundColor: PIN_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2.5,
        borderColor: 'rgba(255,255,255,0.85)',
        overflow: 'hidden',
        shadowColor: PIN_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.65,
        shadowRadius: 14,
        elevation: 12,
      }}>
        {/* Glass shine */}
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '45%',
          backgroundColor: 'rgba(255,255,255,0.20)',
          borderTopLeftRadius: PIN_BODY_RADIUS,
          borderTopRightRadius: PIN_BODY_RADIUS,
        }} />
        {/* Count */}
        <Text style={{
          color: '#FFFFFF',
          fontSize: 15,
          fontFamily: 'Outfit_700Bold',
          textShadowColor: 'rgba(0,0,0,0.3)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
          zIndex: 1,
        }}>5</Text>
      </View>

      {/* Pointer triangle */}
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: 7, borderRightWidth: 7,
        borderTopWidth: 10,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: PIN_COLOR,
        marginTop: -3,
      }} />

      {/* Drop shadow beneath pointer */}
      <View style={{
        width: 14, height: 4,
        borderRadius: 7,
        backgroundColor: 'rgba(0,0,0,0.18)',
        marginTop: 1,
      }} />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingTour() {
  const { width: w, height: h } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  const overlayFade = useRef(new Animated.Value(0)).current;
  const stepFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getTourDone().then((done) => {
      if (!done) {
        setVisible(true);
        Animated.timing(overlayFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
    });
  }, []);

  const steps = buildSteps(w, h, insets);
  const current = steps[step];

  // ── Tooltip geometry ──────────────────────────────────────────────────────
  const TOOLTIP_W = Math.min(w - 40, 320);
  let tooltipLeft, tooltipTop, arrowOffsetLeft;

  if (current.isFinal) {
    tooltipLeft = (w - TOOLTIP_W) / 2;
    tooltipTop = h / 2 - CARD_H / 2 - 20;
    arrowOffsetLeft = null;
  } else if (current.fakePin) {
    const { cx, cy } = current.fakePin;
    tooltipLeft = Math.max(20, Math.min(w - TOOLTIP_W - 20, cx - TOOLTIP_W / 2));
    arrowOffsetLeft = Math.max(16, Math.min(TOOLTIP_W - 36, cx - tooltipLeft - ARROW_H));
    // tooltip sits above the pin body
    tooltipTop = cy - PIN_BODY_RADIUS - CARD_H - ARROW_H - 10;
    tooltipTop = Math.max(insets.top + 8, Math.min(h - CARD_H - 40, tooltipTop));
  } else if (current.target) {
    const { x: tx, y: ty, w: tw, h: th } = current.target;
    const targetCX = tx + tw / 2;
    tooltipLeft = Math.max(20, Math.min(w - TOOLTIP_W - 20, targetCX - TOOLTIP_W / 2));
    arrowOffsetLeft = Math.max(16, Math.min(TOOLTIP_W - 36, targetCX - tooltipLeft - ARROW_H));
    tooltipTop = current.arrowDir === 'up'
      ? ty + th + ARROW_H + 4
      : ty - CARD_H - ARROW_H - 4;
    tooltipTop = Math.max(insets.top + 8, Math.min(h - CARD_H - 40, tooltipTop));
  } else {
    tooltipLeft = (w - TOOLTIP_W) / 2;
    tooltipTop = h / 2 - CARD_H / 2 - 20;
    arrowOffsetLeft = null;
  }

  // ── Step navigation ───────────────────────────────────────────────────────
  const advanceStep = useCallback(() => {
    Animated.timing(stepFade, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
      setStep((s) => s + 1);
      Animated.timing(stepFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [stepFade]);

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
        {/* Dark overlay with optional cutout */}
        <CutoutOverlay target={current.target} />

        {/* Fake pin — step 4 only */}
        {current.fakePin && (
          <Animated.View style={{ opacity: stepFade }}>
            <FakeMapPin cx={current.fakePin.cx} cy={current.fakePin.cy} />
          </Animated.View>
        )}

        {/* Tooltip card */}
        <Animated.View
          style={[
            styles.tooltipWrapper,
            { opacity: stepFade, top: tooltipTop, left: tooltipLeft, width: TOOLTIP_W },
          ]}
        >
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
  tooltipWrapper: {
    position: 'absolute',
  },
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
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: '#BFA0FF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(191, 160, 255, 0.80)',
    lineHeight: 20,
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerSpacer: {
    width: 44,
  },
  skipText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: 'rgba(255,255,255,0.38)',
    minWidth: 44,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: {
    backgroundColor: '#BFA0FF',
    width: 18,
    borderRadius: 3,
  },
  nextBtn: {
    backgroundColor: '#9B5DE5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 44,
    alignItems: 'center',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  arrowUp: {
    width: 0, height: 0,
    borderLeftWidth: ARROW_H, borderRightWidth: ARROW_H, borderBottomWidth: ARROW_H,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: ARROW_COLOR,
    alignSelf: 'flex-start',
    marginBottom: -1,
  },
  arrowDown: {
    width: 0, height: 0,
    borderLeftWidth: ARROW_H, borderRightWidth: ARROW_H, borderTopWidth: ARROW_H,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: ARROW_COLOR,
    alignSelf: 'flex-start',
    marginTop: -1,
  },
});
