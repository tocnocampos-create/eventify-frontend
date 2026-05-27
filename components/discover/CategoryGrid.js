import React, { useMemo } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useDragScroll from '../../hooks/useDragScroll';
import colors from '../../theme/colors';

const CATEGORY_IMAGE_MAP = {
  'Jazz': require('../../assets/categories/jazz.png'),
  'Comedia': require('../../assets/categories/comedy.png'),
  'Nacional': require('../../assets/categories/nacional.png'),
  'Teatro': require('../../assets/categories/theater.png'),
  'Vida Nocturna': require('../../assets/categories/nightlife.png'),
  'Barrios': require('../../assets/categories/barrios.png'),
  'Festivales': require('../../assets/categories/festivals.png'),
  'Cine': require('../../assets/categories/cinema.png'),
  'Museos': require('../../assets/categories/museos.png'),
  'Al aire libre': require('../../assets/categories/ecofriendly.png'),
  'Sunsets': require('../../assets/categories/sunsets.png'),
  'Familiar': require('../../assets/categories/familiar.png'),
  'Ferias': require('../../assets/categories/ferias.png'),
  'City Tour': require('../../assets/categories/ciudad.png'),
};

function chunkInPairs(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

export default function CategoryGrid({ config, onCategoryPress }) {
  const dragRef = useDragScroll();

  const categoryItems = useMemo(() => {
    if (config?.search_categories) {
      return config.search_categories
        .map((sc) => ({
          key: sc.key,
          image: sc.image_url ? { uri: sc.image_url } : (CATEGORY_IMAGE_MAP[sc.key] || null),
        }))
        .filter((c) => c.image !== null);
    }
    return Object.entries(CATEGORY_IMAGE_MAP).map(([key, image]) => ({ key, image }));
  }, [config?.search_categories]);

  const pairs = useMemo(() => chunkInPairs(categoryItems), [categoryItems]);

  if (categoryItems.length === 0) return null;

  return (
    <FlatList
      ref={dragRef}
      data={pairs}
      keyExtractor={(_, idx) => `col-${idx}`}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      scrollEnabled
      renderItem={({ item: pair }) => (
        <View style={styles.column}>
          {pair.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              activeOpacity={0.85}
              style={styles.cardWrapper}
              onPress={() => onCategoryPress?.(cat.key)}
            >
              <View style={styles.card}>
                <Image source={cat.image} style={styles.image} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.65)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.label}>{cat.key}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {pair.length === 1 && <View style={[styles.cardWrapper, { opacity: 0 }]} />}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingLeft: 20, paddingRight: 12 },
  column: { marginRight: 10, justifyContent: 'space-between' },
  cardWrapper: { marginBottom: 10 },
  card: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  label: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    color: colors.text,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
  },
});
