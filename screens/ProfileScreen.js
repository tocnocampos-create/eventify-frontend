import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import TabScreenLayout from '../components/TabScreenLayout';
export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const interests = [
    'Música en Vivo',
    'Exhibiciones de Arte',
    'Vida Nocturna',
    'Festivales',
    'Cine',
    
  ];

  const generalOptions = [
    { title: 'Idioma', value: 'Español' },
    { title: 'Ayuda y Soporte' },
    { title: 'Acerca de' },
  ];

  const ticketsOptions = ['Mis Experiencias', 'Mi Agenda'];

  return (
    <TabScreenLayout style={styles.safeContainer}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
      >
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../assets/profile-placeholder.png')}
              style={styles.profileImage}
            />
            <Text style={styles.name}>Eventify App</Text>
            <Text style={styles.email}>contacto@eventifyapp.cl</Text>
          </View>

          {/* Interests */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Intereses</Text>
              <TouchableOpacity>
                <Text style={styles.addIcon}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.interestsContainer}>
              {interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Notifications */}
          <View style={[styles.section, { marginTop: 30 }]}>
            <View style={styles.optionRow}>
              <Text style={styles.optionText}>Notificaciones</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                thumbColor={notificationsEnabled ? '#A187FF' : '#888'}
                trackColor={{ false: '#444', true: '#C8BFFF' }}
              />
            </View>
          </View>

          {/* Tickets Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tickets y Organización</Text>
            {ticketsOptions.map((title, index) => (
              <TouchableOpacity key={index} style={styles.optionRow}>
                <Text style={styles.optionText}>{title}</Text>
                <Text style={styles.optionArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* General Section (al final) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>General</Text>
            {generalOptions.map((option, index) => (
              <TouchableOpacity key={index} style={styles.optionRow}>
                <Text style={styles.optionText}>{option.title}</Text>
                {option.value && <Text style={styles.optionValue}>{option.value}</Text>}
                <Text style={styles.optionArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
      </ScrollView>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#120E2C',
    position: 'relative',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#A187FF',
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  email: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  addIcon: {
    fontSize: 22,
    fontWeight: '500',
    color: '#A187FF',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 10,
  },
  interestTag: {
    backgroundColor: '#33295E',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  interestText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 12,
    marginTop: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1B33',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  optionValue: {
    marginRight: 8,
    color: '#aaa',
    fontSize: 14,
  },
  optionArrow: {
    fontSize: 18,
    color: '#777',
  },
});
