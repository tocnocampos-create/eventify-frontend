import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal, StyleSheet,
  Animated, Platform, ActivityIndicator, Keyboard, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { useCreateReview } from '../hooks/useCreateReview';

const STAR_SIZE = 36;

export default function ReviewModal({
  visible,
  onClose,
  venueId,
  eventId,
  venueName,
  eventName,
}) {
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeVal = useRef(new Animated.Value(0)).current;

  const { mutate, isPending, error } = useCreateReview({ venueId, eventId });

  const entityName = venueName || eventName || '';

  useEffect(() => {
    if (!visible) return;
    setRating(0);
    setComment('');
    setSubmitted(false);

    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, damping: 24, stiffness: 260, useNativeDriver: true }),
      Animated.timing(fadeVal, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const animateClose = useCallback((cb) => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideY, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeVal, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      if (cb) cb();
      else onClose();
    });
  }, [onClose]);

  const handleClose = useCallback(() => animateClose(), [animateClose]);

  const handleSubmit = useCallback(() => {
    if (!rating || isPending) return;
    mutate(
      { rating, comment: comment.trim() || null, venueId, eventId },
      {
        onSuccess: () => {
          setSubmitted(true);
          setTimeout(() => animateClose(() => onClose()), 1200);
        },
      },
    );
  }, [rating, comment, venueId, eventId, isPending, mutate, animateClose, onClose]);

  const canSubmit = rating > 0 && !isPending && !submitted;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[st.backdrop, { opacity: fadeVal }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>

      <Animated.View style={[st.sheet, { transform: [{ translateY: slideY }] }]}>
        <LinearGradient colors={[colors.authBg, colors.authBgDeep]} style={StyleSheet.absoluteFill} />

        {/* Handle */}
        <View style={st.handleWrap}><View style={st.handle} /></View>

        {/* Header */}
        <View style={st.header}>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>Escribir una reseña</Text>
            {!!entityName && <Text style={st.subtitle} numberOfLines={1}>{entityName}</Text>}
          </View>
          <TouchableOpacity onPress={handleClose} style={st.closeBtn}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {submitted ? (
          <View style={st.successContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#4ADE80" />
            <Text style={st.successText}>¡Reseña enviada!</Text>
          </View>
        ) : (
          <View style={st.body}>
            {/* Star rating */}
            <Text style={st.label}>Tu calificación</Text>
            <View style={st.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)} activeOpacity={0.7}>
                  <Ionicons
                    name={n <= rating ? 'star' : 'star-outline'}
                    size={STAR_SIZE}
                    color="#FFD166"
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Comment */}
            <Text style={st.label}>Comentario (opcional)</Text>
            <TextInput
              style={st.input}
              placeholder="Comparte tu experiencia..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              maxLength={500}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />

            {/* Error */}
            {!!error && (
              <Text style={st.errorText}>
                {error?.response?.data?.detail || 'Error al enviar la reseña'}
              </Text>
            )}

            {/* Submit */}
            <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit} activeOpacity={0.85}>
              <LinearGradient
                colors={canSubmit
                  ? [colors.authGradientStart, colors.authGradientEnd]
                  : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
                style={st.submitBtn}
              >
                {isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[st.submitText, !canSubmit && { opacity: 0.4 }]}>Enviar reseña</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    ...(Platform.OS === 'web' && {
      maxWidth: 600,
      width: '100%',
      marginHorizontal: 'auto',
    }),
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    color: '#fff', fontSize: 22, fontWeight: '700',
  },
  subtitle: {
    color: colors.primary, fontSize: 13, marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
  },
  body: {
    paddingHorizontal: 20,
  },
  label: {
    color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600',
    marginBottom: 8, marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  input: {
    backgroundColor: colors.authInputBg,
    borderWidth: 1,
    borderColor: colors.authInputBorder,
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    padding: 14,
    minHeight: 100,
    marginBottom: 16,
  },
  errorText: {
    color: colors.authError,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff', fontSize: 16, fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successText: {
    color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 12,
  },
});
