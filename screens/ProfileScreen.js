import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  User,
  ChevronRight,
  Bell,
  Plus,
  Ticket,
  CalendarDays,
  X,
  MessageSquare,
} from 'lucide-react-native';
import TabScreenLayout from '../components/TabScreenLayout';
import GlassOverlay from '../components/home/GlassOverlay';
import InterestSelector from '../components/InterestSelector';
import colors from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { useUserInterests, useSetInterests, useUserSettings, useUpdateSettings } from '../hooks/useUserPreferences';
import { submitFeedback } from '../api/feedback';
import { useAppConfig, getCategoryColors, getCategoryIcons } from '../hooks/useAppConfig';

const AVATAR_COLORS = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1',
  '#3949AB', '#1E88E5', '#00ACC1', '#00897B',
  '#43A047', '#7CB342', '#F4511E', '#6D4C41',
];

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { data: interests = [] } = useUserInterests();
  const setInterestsMutation = useSetInterests();
  const { data: config } = useAppConfig();
  const CATEGORY_COLORS = getCategoryColors(config?.categories);
  const CATEGORY_ICONS = getCategoryIcons(config?.categories);
  const { data: settings } = useUserSettings();
  const updateSettingsMutation = useUpdateSettings();
  const [interestModalVisible, setInterestModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const notificationsEnabled = settings?.notifications_enabled ?? true;

  const handleNotificationsToggle = (value) => {
    updateSettingsMutation.mutate({ notifications_enabled: value });
  };

  const showToast = () => {
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackLoading(true);
    try {
      await submitFeedback(feedbackText.trim());
      setFeedbackText('');
      showToast();
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleSaveInterests = async (newInterests) => {
    await setInterestsMutation.mutateAsync(newInterests);
    setInterestModalVisible(false);
  };

  const ticketsOptions = [
    {
      title: 'Mis Experiencias',
      icon: Ticket,
      onPress: () => navigation.navigate('MisExperiencias'),
    },
    {
      title: 'Mi Agenda',
      icon: CalendarDays,
      onPress: () => navigation.navigate('MyAgenda'),
    },
  ];

  return (
    <TabScreenLayout style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileImageRing}
          >
            <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor(user?.full_name) }]}>
              <Text style={styles.avatarLetter}>{getInitial(user?.full_name)}</Text>
            </View>
          </LinearGradient>
          <Text style={styles.name}>{user?.full_name || 'Usuario'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
        </View>

        {/* Interests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Intereses</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setInterestModalVisible(true)}
            >
              <Plus size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.interestsContainer}>
            {interests.length > 0 ? (
              interests
                .filter(i => i != null && i.category && i.category !== 'null')
                .map((interest, index) => {
                const catColor = CATEGORY_COLORS[interest.category] || colors.primary;
                const catIcon = CATEGORY_ICONS[interest.category] || 'ellipse';
                const label = interest.subtype || interest.category;
                return (
                  <View
                    key={index}
                    style={[
                      styles.interestTag,
                      {
                        backgroundColor: catColor + '1A',
                        borderLeftColor: catColor,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 12 }}>{
                      { 'musical-notes': '🎵', 'theater-masks': '🎭', 'happy': '😂',
                        'color-palette': '🎨', 'film': '🎬', 'people': '👨‍👩‍👧', 'moon': '🌙' }[catIcon] || '🎫'
                    }</Text>
                    <Text style={[styles.interestText, { color: catColor }]}>
                      {label}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={{ color: colors.textDim, fontSize: 13 }}>
                Aún no has seleccionado intereses.
              </Text>
            )}
          </View>
        </View>

        {/* Notifications */}
        <View style={[styles.section, { marginTop: 30 }]}>
          <View style={styles.optionRow}>
            <Bell size={18} color={colors.textDim} style={styles.optionIcon} />
            <Text style={styles.optionText}>Notificaciones</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              disabled={updateSettingsMutation.isPending}
              thumbColor={notificationsEnabled ? colors.primary : '#888'}
              trackColor={{ false: '#444', true: colors.primaryDark }}
            />
          </View>
        </View>

        {/* Tickets Section */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Ticket size={16} color={colors.textDim} />
            <Text style={styles.sectionLabel}>Tickets y Organización</Text>
          </View>
          {ticketsOptions.map((option, index) => (
            <TouchableOpacity key={index} style={styles.optionRow} onPress={option.onPress}>
              <option.icon size={18} color={colors.textDim} style={styles.optionIcon} />
              <Text style={styles.optionText}>{option.title}</Text>
              <ChevronRight size={18} color={colors.textDim} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Feedback */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <MessageSquare size={16} color={colors.textDim} />
            <Text style={styles.sectionLabel}>Enviar feedback</Text>
          </View>
          <TextInput
            style={styles.feedbackInput}
            value={feedbackText}
            onChangeText={setFeedbackText}
            placeholder="¿Qué mejorarías o qué te faltó?"
            placeholderTextColor={colors.textDim}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.feedbackBtn, (!feedbackText.trim() || feedbackLoading) && styles.feedbackBtnDim]}
            onPress={handleSendFeedback}
            activeOpacity={feedbackText.trim() && !feedbackLoading ? 0.8 : 1}
            disabled={feedbackLoading}
          >
            {feedbackLoading
              ? <ActivityIndicator size="small" color="#22003D" />
              : <Text style={styles.feedbackBtnText}>Enviar feedback</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Interest Editor Modal */}
      <Modal
        visible={interestModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setInterestModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar intereses</Text>
            <TouchableOpacity onPress={() => setInterestModalVisible(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <InterestSelector
              initialInterests={interests}
              onSave={handleSaveInterests}
              isLoading={setInterestsMutation.isPending}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>¡Muchas gracias por tu feedback! 🙌</Text>
        </Animated.View>
      )}
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    position: 'relative',
  },
  scrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  profileImageRing: {
    width: 126,
    height: 126,
    borderRadius: 63,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 48,
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
    color: colors.text,
  },
  email: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: colors.text,
  },
  addButton: {
    padding: 4,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  interestText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.textDim,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
    color: colors.text,
  },
  optionValue: {
    marginRight: 8,
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  feedbackInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    fontFamily: 'Outfit_400Regular',
    fontSize: 16,
    minHeight: 80,
    marginBottom: 10,
  },
  feedbackBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  feedbackBtnDim: {
    opacity: 0.45,
  },
  feedbackBtnText: {
    color: '#fff',
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
  },
  logoutButton: {
    marginTop: 32,
    alignItems: 'center',
    paddingVertical: 14,
  },
  logoutText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#534AB7',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
