import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import useDragScroll from '../../hooks/useDragScroll';
import colors from '../../theme/colors';

export default function DiscoverSection({ title, data, renderItem, keyExtractor, onSeeAll }) {
  const dragRef = useDragScroll();

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={styles.seeAll}>
            <Text style={styles.seeAllText}>Ver más</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        ref={dragRef}
        horizontal
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor || ((item, idx) => (item.id ?? idx).toString())}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        scrollEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  title: { color: colors.text, fontSize: 18, fontFamily: 'Outfit_600SemiBold' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { color: colors.primary, fontSize: 14, fontFamily: 'Outfit_500Medium' },
  listContent: { paddingHorizontal: 20 },
});
