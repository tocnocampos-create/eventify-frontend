import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Star, Ticket } from 'lucide-react-native';
import colors from '../theme/colors';
import GlassOverlay from '../components/home/GlassOverlay';
import { useMyReviews } from '../hooks/useUserPreferences';

import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

function StarRating({ rating }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          color={n <= rating ? '#FFD700' : '#444'}
          fill={n <= rating ? '#FFD700' : 'transparent'}
        />
      ))}
    </View>
  );
}

function ReviewCard({ review }) {
  const subject = review.event_name || review.venue_name || 'Experiencia';
  const isEvent = !!review.event_name;
  const date = review.created_at
    ? dayjs(review.created_at).format('D [de] MMMM, YYYY')
    : '';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.subjectRow}>
          <Text style={styles.subjectType}>{isEvent ? 'Evento' : 'Lugar'}</Text>
          <Text style={styles.subjectName} numberOfLines={2}>{subject}</Text>
        </View>
        <StarRating rating={review.rating} />
      </View>
      {!!review.comment && (
        <Text style={styles.comment}>{review.comment}</Text>
      )}
      {!!date && <Text style={styles.date}>{date}</Text>}
    </View>
  );
}

export default function MisExperienciasScreen({ navigation }) {
  const { data: reviews = [], isLoading } = useMyReviews();

  return (
    <SafeAreaView style={styles.container}>
      <GlassOverlay />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Experiencias</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.centered}>
          <Ticket size={48} color={colors.textDim} />
          <Text style={styles.emptyText}>Aún no has dejado ninguna reseña.</Text>
          <Text style={styles.emptySubtext}>
            Califica eventos y lugares para que aparezcan aquí.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.count}>{reviews.length} reseña{reviews.length !== 1 ? 's' : ''}</Text>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: colors.text,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.textDim,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  count: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  subjectRow: {
    flex: 1,
    gap: 2,
  },
  subjectType: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subjectName: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    paddingTop: 2,
  },
  comment: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
    opacity: 0.7,
  },
});
