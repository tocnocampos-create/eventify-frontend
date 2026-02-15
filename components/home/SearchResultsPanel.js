import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import GlassOverlay from './GlassOverlay';
import colors from '../../theme/colors';
import { getCategoryBorderColor } from '../../utils/pinColors';

export default function SearchResultsPanel({
  searchEvents,
  searchVenues,
  onFocusEvent,
  onGoToEventDetail,
  onFocusVenue,
  onGoToVenue,
  style,
}) {
  return (
    <GlassOverlay style={[styles.container, style]} borderRadius={16}>
      <ScrollView>
        {searchEvents.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Pr\u00F3ximos Eventos</Text>
            {searchEvents.map((e, i) => (
              <View key={`ev-${i}`} style={styles.row}>
                <View style={[styles.accent, { backgroundColor: getCategoryBorderColor(e.category || '') || colors.primary }]} />
                <TouchableOpacity style={styles.rowContent} onPress={() => onFocusEvent(e)}>
                  <Text style={styles.name}>{e.title}</Text>
                  <Text style={styles.sub}>{e.location}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onGoToEventDetail(e)} style={styles.chevronBtn}>
                  <ChevronRight size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {searchVenues.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Venues</Text>
            {searchVenues.map((v, i) => (
              <View key={`venue-${i}`} style={styles.row}>
                <View style={[styles.accent, { backgroundColor: colors.accent }]} />
                <TouchableOpacity style={styles.rowContent} onPress={() => onFocusVenue(v)}>
                  <Text style={styles.name}>{v.name}</Text>
                  <Text style={styles.sub}>{v.type}{v.city ? ` \u00B7 ${v.city}` : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onGoToVenue(v)} style={styles.chevronBtn}>
                  <ChevronRight size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </GlassOverlay>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    maxHeight: 300,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  accent: {
    width: 3,
    height: '80%',
    minHeight: 24,
    borderRadius: 2,
    marginRight: 10,
  },
  rowContent: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  sub: {
    color: colors.textDim,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  chevronBtn: {
    marginLeft: 10,
    padding: 4,
  },
});
