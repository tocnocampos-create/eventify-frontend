import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
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
} from 'lucide-react-native';
import TabScreenLayout from '../components/TabScreenLayout';
import GlassOverlay from '../components/home/GlassOverlay';
import InterestSelector from '../components/InterestSelector';
import colors from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { useUserInterests, useSetInterests } from '../hooks/useUserPreferences';

const CATEGORY_COLORS = {
  'Música': colors.pinMusica,
  'Teatro': colors.pinTeatro,
  'Comedia': colors.pinComedia,
  'Arte': colors.pinArte,
  'Cine': colors.pinCine,
};

const CATEGORY_ICONS = {
  'Música': 'musical-notes',
  'Teatro': 'ticket',
  'Comedia': 'happy',
  'Arte': 'color-palette',
  'Cine': 'film',
};

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { data: interests = [] } = useUserInterests();
  const setInterestsMutation = useSetInterests();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [interestModalVisible, setInterestModalVisible] = useState(false);

  const handleSaveInterests = async (newInterests) => {
    await setInterestsMutation.mutateAsync(newInterests);
    setInterestModalVisible(false);
  };

  const ticketsOptions = [
    {
      title: 'Mis Experiencias',
      icon: Ticket,
      onPress: () => Alert.alert('Próximamente', 'Esta función estará disponible pronto.'),
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
            <Image
              source={require('../assets/profile-placeholder.png')}
              style={styles.profileImage}
            />
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
              interests.map((interest, index) => {
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
                    <Ionicons name={catIcon} size={12} color={catColor} />
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
              onValueChange={setNotificationsEnabled}
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
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
});
