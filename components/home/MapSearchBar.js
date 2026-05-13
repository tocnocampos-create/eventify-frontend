import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, SlidersHorizontal, MapPin, Footprints, TreePine, X } from 'lucide-react-native';
import GlassOverlay from './GlassOverlay';
import colors from '../../theme/colors';

export default function MapSearchBar({
  searchQuery,
  onSearchChange,
  onClear,
  showFilters,
  onToggleFilters,
  overlayMode = 0,
  onCycleOverlay,
  style,
}) {
  return (
    <GlassOverlay style={[styles.container, style]} borderRadius={16}>
      <View style={styles.inner}>
        <Search size={18} color={colors.textDim} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar en Santiago"
          placeholderTextColor={colors.textDim}
          style={styles.input}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
            <X size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.iconBtn,
            overlayMode === 1 && styles.iconBtnActive,
            overlayMode === 2 && styles.iconBtnActiveGreen,
          ]}
          onPress={onCycleOverlay}
          activeOpacity={0.7}
        >
          {overlayMode === 2 ? (
            <TreePine size={20} color="#fff" />
          ) : overlayMode === 1 ? (
            <Footprints size={20} color="#fff" />
          ) : (
            <MapPin size={20} color="#fff" />
          )}
        </TouchableOpacity>
        {showFilters ? (
          <TouchableOpacity onPress={onToggleFilters} activeOpacity={0.7}>
            <LinearGradient
              colors={[colors.authGradientStart, colors.authGradientEnd]}
              style={styles.filterGradient}
            >
              <SlidersHorizontal size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onToggleFilters}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </GlassOverlay>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  clearBtn: {
    marginLeft: 8,
    padding: 2,
  },
  iconBtn: {
    marginLeft: 10,
    backgroundColor: colors.glassLight,
    borderRadius: 8,
    padding: 6,
  },
  iconBtnActive: {
    backgroundColor: colors.authGradientStart,
  },
  iconBtnActiveGreen: {
    backgroundColor: '#2D7D46',
  },
  filterGradient: {
    marginLeft: 10,
    borderRadius: 8,
    padding: 6,
  },
});
