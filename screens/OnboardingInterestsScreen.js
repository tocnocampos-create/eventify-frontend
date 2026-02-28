import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import InterestSelector from '../components/InterestSelector';
import { useSetInterests } from '../hooks/useUserPreferences';
import { useAuth } from '../contexts/AuthContext';
import { fetchMe } from '../api/auth';

export default function OnboardingInterestsScreen({ navigation }) {
  const { refreshUser } = useAuth();
  const setInterestsMutation = useSetInterests();

  const handleSave = async (interests) => {
    await setInterestsMutation.mutateAsync(interests);
    await refreshUser();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Tus intereses</Text>
        <Text style={styles.subtitle}>
          Selecciona las categorías que te interesan para personalizar tus recomendaciones.
        </Text>
        <InterestSelector
          onSave={handleSave}
          isLoading={setInterestsMutation.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textDim,
    marginBottom: 28,
    lineHeight: 22,
  },
});
