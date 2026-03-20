import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import InterestSelector from '../components/InterestSelector';
import { useSetInterests } from '../hooks/useUserPreferences';
import { useAuth } from '../contexts/AuthContext';

const EXPLORATION_MODES = [
  {
    key: 'Espontaneo',
    emoji: '⚡',
    title: 'Espontáneo',
    subtitle: 'Decido en el momento',
    color: '#BFA0FF',
  },
  {
    key: 'Explorador',
    emoji: '🧭',
    title: 'Explorador',
    subtitle: 'Quiero descubrir la ciudad',
    color: '#00A3FF',
  },
  {
    key: 'EnFamilia',
    emoji: '🧸',
    title: 'En familia',
    subtitle: 'Salgo con mis hijos',
    color: '#FF8C69',
  },
  {
    key: 'Tranquilo',
    emoji: '🌿',
    title: 'Tranquilo',
    subtitle: 'Prefiero lo cercano y sin ruido',
    color: '#4ADE80',
  },
  {
    key: 'EnGrupo',
    emoji: '🎉',
    title: 'En grupo',
    subtitle: 'Salgo con amigos a pasarla bien',
    color: '#FBBF24',
  },
];

export default function OnboardingInterestsScreen() {
  const { refreshUser } = useAuth();
  const setInterestsMutation = useSetInterests();

  const [step, setStep] = useState(1);
  const [selectedModes, setSelectedModes] = useState([]);
  const [categoryInterests, setCategoryInterests] = useState([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const toggleMode = (key) => {
    setSelectedModes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const goToStep2 = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setStep(2);
  };

  const handleConfirm = async () => {
    const modeItems = selectedModes.map((mode) => ({ exploration_mode: mode }));
    const allInterests = [...modeItems, ...categoryInterests];
    await setInterestsMutation.mutateAsync(allInterests);
    await refreshUser();
  };

  const isLoading = setInterestsMutation.isPending;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.animated, { opacity: fadeAnim }]}>
        {step === 1 ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepBadge}>Paso 1 de 2</Text>
            <Text style={styles.title}>¿Cómo vivís{'\n'}la ciudad?</Text>
            <Text style={styles.subtitle}>
              Elegí uno o más perfiles que te representen.
            </Text>

            <View style={styles.modeList}>
              {EXPLORATION_MODES.map((mode) => {
                const isSelected = selectedModes.includes(mode.key);
                return (
                  <TouchableOpacity
                    key={mode.key}
                    style={[
                      styles.modeCard,
                      isSelected && {
                        borderColor: mode.color,
                        backgroundColor: `${mode.color}18`,
                      },
                    ]}
                    onPress={() => toggleMode(mode.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.modeEmoji}>{mode.emoji}</Text>
                    <View style={styles.modeText}>
                      <Text
                        style={[
                          styles.modeTitle,
                          isSelected && { color: mode.color },
                        ]}
                      >
                        {mode.title}
                      </Text>
                      <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
                    </View>
                    {isSelected && (
                      <View
                        style={[styles.checkDot, { backgroundColor: mode.color }]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.actionButton,
                selectedModes.length === 0 && styles.actionButtonDisabled,
              ]}
              onPress={goToStep2}
              disabled={selectedModes.length === 0}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Continuar</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepBadge}>Paso 2 de 2</Text>
            <Text style={styles.title}>¿Qué te gusta?</Text>
            <Text style={styles.subtitle}>
              Seleccioná las categorías que más te interesan.
            </Text>

            <InterestSelector
              hideButton
              onSelectionChange={setCategoryInterests}
            />

            <TouchableOpacity
              style={[
                styles.actionButton,
                (categoryInterests.length === 0 || isLoading) &&
                  styles.actionButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={categoryInterests.length === 0 || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#22003D" />
              ) : (
                <Text style={styles.actionButtonText}>Confirmar</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  animated: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 40,
  },
  stepBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textDim,
    lineHeight: 22,
    marginBottom: 28,
  },
  modeList: {
    gap: 12,
    marginBottom: 32,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassLight,
  },
  modeEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  modeText: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  modeSubtitle: {
    fontSize: 13,
    color: colors.textDim,
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    color: '#22003D',
    fontSize: 16,
    fontWeight: '700',
  },
});
