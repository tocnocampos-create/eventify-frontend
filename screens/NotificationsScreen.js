// screens/NotificationScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import TabScreenLayout from '../components/TabScreenLayout';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import events from '../data/events';
export default function NotificationScreen({ navigation }) {
  const today = dayjs();
  
  // Filter only upcoming events (today or future)
  const upcomingEvents = events.filter((event) => {
    const eventDate = dayjs(event.date);
    return eventDate.isSame(today, 'day') || eventDate.isAfter(today, 'day');
  });

  // Get first 2 upcoming events
  const upcoming = upcomingEvents.slice(0, 2);
  
  // Get next 3 upcoming events for recommendations
  const recommended = upcomingEvents.slice(2, 5);

  // Simulación: venues que el usuario sigue
  const followedVenues = ['Teatro Nescafé de las Artes', 'Centro Cultural San Ginés'];

  const venueEventMap = followedVenues.reduce((acc, venue) => {
    // Filter venue events from already filtered upcoming events and take only the first one
    const venueEvents = upcomingEvents.filter((event) => event.location === venue);
    if (venueEvents.length > 0) {
      acc[venue] = [venueEvents[0]]; // Only show first event from each venue
    }
    return acc;
  }, {});

  // Format date/time same as HomeScreen carousel: "08 nov 2025 21:30"
  const formatEventDateTime = (event) => {
    const d = event?.date ? dayjs(event.date) : null;
    if (!d || !d.isValid()) return '';
    const datePart = d.format('DD MMM YYYY').toLowerCase(); // ej: "08 nov 2025"
    const timePart = event?.timeStart ? event.timeStart : null;
    return timePart ? `${datePart} ${timePart}` : datePart;
  };

  const renderEventCard = (event, showDate = true) => (
    <TouchableOpacity
      key={event.id}
      style={styles.card}
      onPress={() => navigation.navigate('EventDetail', { event })}
    >
      {event.image ? (
        <Image source={{ uri: event.image }} style={styles.image} />
      ) : (
        <View style={styles.placeholderImage} />
      )}
      <View style={styles.cardContent}>
        <Text style={styles.title}>{event.title}</Text>
        {showDate && <Text style={styles.date}>{formatEventDateTime(event)}</Text>}
        <Text style={styles.location}>{event.location}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHorizontalCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('EventDetail', { event: item })}
      style={styles.smallCard}
    >
      <Image source={{ uri: item.image }} style={styles.smallImage} />
      <Text style={styles.smallTitle}>{item.title}</Text>
      <Text style={styles.smallDate}>{formatEventDateTime(item)}</Text>
    </TouchableOpacity>
  );

  return (
    <TabScreenLayout style={styles.container}>
      <ScrollView
        style={styles.scrollView}
      >
          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
            Próximas Experiencias:
          </Text>
          {upcoming.map((event) => renderEventCard(event))}

          <Text style={styles.sectionTitle}>En Mis Venues:</Text>
          {Object.keys(venueEventMap).length > 0 ? (
            Object.entries(venueEventMap).map(([venue, venueEvents]) => (
              <View key={venue} style={styles.venueSection}>
                <Text style={styles.venueTitle}>{venue}:</Text>
                <FlatList
                  horizontal
                  data={venueEvents}
                  renderItem={renderHorizontalCard}
                  keyExtractor={(item) => item.id.toString()}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 4 }}
                  scrollEnabled={false}
                />
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              Aún no sigues ningún venue.
            </Text>
          )}

          <Text style={styles.sectionTitle}>Recomendaciones:</Text>
          {recommended.map((event) => renderEventCard(event, false))}
      </ScrollView>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0C0032',
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    padding: 16,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  venueSection: {
    marginBottom: 16,
  },
  venueTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#3E2670',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  image: {
    width: 100,
    height: 100,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    backgroundColor: '#999',
  },
  cardContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 2,
  },
  location: {
    color: '#bbb',
    fontSize: 13,
    marginTop: 2,
  },
  smallCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#3E2670',
    borderRadius: 10,
    padding: 6,
  },
  smallImage: {
    width: '100%',
    height: 80,
    borderRadius: 6,
  },
  smallTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
  smallDate: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 2,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
