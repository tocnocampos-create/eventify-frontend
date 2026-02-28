import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { SUBCATEGORIES } from '../utils/filters.schema';

const CATEGORIES = ['Música', 'Teatro', 'Comedia', 'Arte', 'Cine'];

const CATEGORY_ICONS = {
  'Música': 'musical-notes',
  'Teatro': 'ticket',
  'Comedia': 'happy',
  'Arte': 'color-palette',
  'Cine': 'film',
};

const CATEGORY_COLORS = {
  'Música': colors.pinMusica,
  'Teatro': colors.pinTeatro,
  'Comedia': colors.pinComedia,
  'Arte': colors.pinArte,
  'Cine': colors.pinCine,
};

export default function InterestSelector({ initialInterests = [], onSave, isLoading = false }) {
  // State: { category: Set of subtypes } — empty Set means whole category
  const [selected, setSelected] = useState(() => {
    const map = {};
    for (const item of initialInterests) {
      if (!map[item.category]) map[item.category] = new Set();
      if (item.subtype) map[item.category].add(item.subtype);
    }
    return map;
  });

  const [expandedCategory, setExpandedCategory] = useState(null);

  const toggleCategory = useCallback((cat) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[cat]) {
        delete next[cat];
        if (expandedCategory === cat) setExpandedCategory(null);
      } else {
        next[cat] = new Set();
        const subs = SUBCATEGORIES[cat];
        if (subs && subs.length > 0) {
          setExpandedCategory(cat);
        }
      }
      return next;
    });
  }, [expandedCategory]);

  const toggleSubtype = useCallback((cat, sub) => {
    setSelected((prev) => {
      const next = { ...prev };
      const subs = new Set(next[cat] || []);
      if (subs.has(sub)) {
        subs.delete(sub);
      } else {
        subs.add(sub);
      }
      next[cat] = subs;
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    const interests = [];
    for (const [category, subtypes] of Object.entries(selected)) {
      if (subtypes.size === 0) {
        interests.push({ category });
      } else {
        for (const subtype of subtypes) {
          interests.push({ category, subtype });
        }
      }
    }
    onSave(interests);
  }, [selected, onSave]);

  const hasSelection = Object.keys(selected).length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.categoriesGrid}>
        {CATEGORIES.map((cat) => {
          const isSelected = !!selected[cat];
          const catColor = CATEGORY_COLORS[cat];
          return (
            <View key={cat}>
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  isSelected && { borderColor: catColor, backgroundColor: `${catColor}22` },
                ]}
                onPress={() => toggleCategory(cat)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={CATEGORY_ICONS[cat]}
                  size={20}
                  color={isSelected ? catColor : colors.textDim}
                />
                <Text style={[styles.categoryText, isSelected && { color: '#fff' }]}>
                  {cat}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={18} color={catColor} />
                )}
              </TouchableOpacity>

              {/* Subtypes row */}
              {isSelected && expandedCategory === cat && SUBCATEGORIES[cat]?.length > 0 && (
                <View style={styles.subtypesRow}>
                  {SUBCATEGORIES[cat].map((sub) => {
                    const subSelected = selected[cat]?.has(sub);
                    return (
                      <TouchableOpacity
                        key={sub}
                        style={[
                          styles.subtypeChip,
                          subSelected && { borderColor: catColor, backgroundColor: `${catColor}33` },
                        ]}
                        onPress={() => toggleSubtype(cat, sub)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[styles.subtypeText, subSelected && { color: '#fff' }]}
                        >
                          {sub}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Expand/collapse toggle for categories with subtypes */}
              {isSelected && SUBCATEGORIES[cat]?.length > 0 && expandedCategory !== cat && (
                <TouchableOpacity
                  style={styles.expandToggle}
                  onPress={() => setExpandedCategory(cat)}
                >
                  <Text style={[styles.expandText, { color: catColor }]}>
                    Personalizar subtipos
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={catColor} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.confirmButton, !hasSelection && styles.confirmButtonDisabled]}
        onPress={handleSave}
        disabled={!hasSelection || isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#22003D" />
        ) : (
          <Text style={styles.confirmText}>Confirmar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassLight,
  },
  categoryText: {
    flex: 1,
    fontSize: 16,
    color: colors.textDim,
    fontWeight: '600',
  },
  subtypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingLeft: 8,
  },
  subtypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassLight,
  },
  subtypeText: {
    fontSize: 13,
    color: colors.textDim,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingLeft: 8,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    color: '#22003D',
    fontSize: 16,
    fontWeight: '700',
  },
});
