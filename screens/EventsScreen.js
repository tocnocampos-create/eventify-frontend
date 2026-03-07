// screens/EventsScreen.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TabScreenLayout from '../components/TabScreenLayout';
import GlassOverlay from '../components/home/GlassOverlay';
import { useSearch } from '../hooks/useSearch';
import useDragScroll from '../hooks/useDragScroll';
import { useNavigation } from '@react-navigation/native';
import {
  Calendar,
  Music,
  Drama,
  Laugh,
  Palette,
  Clapperboard,
  X,
  Search,
  MapPin,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { useIsEventSaved, useToggleSaveEvent } from '../hooks/useUserPreferences';
import { formatEventDateTime } from '../utils/mapHelpers';
import { categoryColors } from '../utils/pinColors';
import { normalizeCategory } from '../utils/filters.schema';
import { useAppConfig, getCategoryBadgeColors, getSubcategories, getCategoryNames } from '../hooks/useAppConfig';

import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

// utilidades de filtros (solo logica)
import { isLive } from '../utils/filtering.js';
import { SUBCATEGORIES as FALLBACK_SUBCATEGORIES, normalizeEventType } from '../utils/filters.schema.js';

function SaveButton({ eventId }) {
  const { data: isSaved } = useIsEventSaved(eventId);
  const { mutate: toggle } = useToggleSaveEvent(eventId);

  return (
    <TouchableOpacity
      style={[styles.saveBtn, isSaved && styles.saveBtnActive]}
      activeOpacity={0.7}
      onPress={(e) => { e.stopPropagation?.(); toggle(!!isSaved); }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons
        name={isSaved ? 'bookmark' : 'bookmark-outline'}
        size={16}
        color={isSaved ? '#BFA0FF' : '#fff'}
      />
      <Text style={[styles.saveBtnText, isSaved && styles.saveBtnTextActive]}>
        {isSaved ? 'Guardado' : 'Guardar'}
      </Text>
    </TouchableOpacity>
  );
}

function buildFilters(subcategories) {
  const subs = subcategories || FALLBACK_SUBCATEGORIES;
  return {
    Fecha: ['Ahora', 'Hoy', 'Esta semana', 'Este mes'],
    ...Object.keys(subs).reduce((acc, cat) => { acc[cat] = subs[cat]; return acc; }, {}),
  };
}


// Helper: compute date range from Spanish date tag
function getDateRange(tag) {
  const today = dayjs();
  switch (tag) {
    case 'Hoy':
      return { startDate: today.format('YYYY-MM-DD'), endDate: today.format('YYYY-MM-DD') };
    case 'Esta semana': {
      const endOfWeek = today.endOf('week');
      return { startDate: today.format('YYYY-MM-DD'), endDate: endOfWeek.format('YYYY-MM-DD') };
    }
    case 'Este mes': {
      const endOfMonth = today.endOf('month');
      return { startDate: today.format('YYYY-MM-DD'), endDate: endOfMonth.format('YYYY-MM-DD') };
    }
    default:
      // ALL or Ahora: today to +1 year
      return { startDate: today.format('YYYY-MM-DD'), endDate: today.add(1, 'year').format('YYYY-MM-DD') };
  }
}

export default function EventsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectedDateTag, setSelectedDateTag] = useState('ALL');
  const [showDropdown, setShowDropdown] = useState(false);

  const navigation = useNavigation();
  const dragRef = useDragScroll();
  const { data: config } = useAppConfig();
  const badgeColors = getCategoryBadgeColors(config?.categories);
  const configSubcategories = getSubcategories(config?.categories);
  const SUBCATEGORIES = Object.keys(configSubcategories).length > 0 ? configSubcategories : FALLBACK_SUBCATEGORIES;
  const FILTERS = buildFilters(SUBCATEGORIES);
  const categoryNames = getCategoryNames(config?.categories) || Object.keys(FALLBACK_SUBCATEGORIES);

  // Debounce search query (300ms)
  const debounceRef = useRef(null);
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      const trimmed = searchQuery.trim();
      setDebouncedQuery(trimmed);
      if (trimmed.length > 0) setShowDropdown(true);
      else setShowDropdown(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  // Build search params for backend
  const searchParams = useMemo(() => {
    const { startDate, endDate } = getDateRange(selectedDateTag);
    return {
      q: debouncedQuery || undefined,
      startDate,
      endDate,
      returnType: 'both',
      limit: 200,
    };
  }, [debouncedQuery, selectedDateTag]);

  // API data via backend search
  const { data: searchData, isLoading } = useSearch(searchParams);
  const venuesData = searchData?.venues ?? [];
  const eventsApiData = searchData?.events ?? [];

  // Helper to toggle category
  const toggleCategory = (category) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Helper to toggle type (with category context)
  const toggleType = (type, category = null) => {
    const cat = category || activeFilter;
    const typeKey = cat && cat !== 'Fecha' ? `${cat}::${type}` : type;

    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeKey)) {
        next.delete(typeKey);
      } else {
        next.add(typeKey);
      }
      return next;
    });
  };

  // Helper to toggle date tag
  const toggleDateTag = (tag) => {
    setSelectedDateTag((prev) => (prev === tag ? 'ALL' : tag));
    setActiveFilter(null);
  };

  // Helper to remove a filter from chips
  const removeFilter = (filter) => {
    if (FILTERS.Fecha.includes(filter)) {
      setSelectedDateTag('ALL');
    } else if (filter.includes(' · ')) {
      const [cat, subcat] = filter.split(' · ');
      const typeKey = `${cat}::${subcat}`;

      setSelectedTypes((prev) => {
        const next = new Set(prev);
        next.delete(typeKey);
        return next;
      });

      setSelectedCategories((prev) => {
        const next = new Set(prev);
        next.delete(cat);
        return next;
      });
    } else if (categoryNames.includes(filter)) {
      setSelectedCategories((prev) => {
        const next = new Set(prev);
        next.delete(filter);
        return next;
      });
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategories(new Set());
    setSelectedTypes(new Set());
    setSelectedDateTag('ALL');
  };

  // Clear filters for the active filter category
  const clearActiveFilterCategory = () => {
    if (activeFilter === 'Fecha') {
      setSelectedDateTag('ALL');
    } else if (activeFilter && SUBCATEGORIES[activeFilter]) {
      const subcats = SUBCATEGORIES[activeFilter];
      setSelectedTypes((prev) => {
        const next = new Set(prev);
        subcats.forEach(subcat => {
          const typeKey = `${activeFilter}::${subcat}`;
          next.delete(typeKey);
        });
        return next;
      });
      setSelectedCategories((prev) => {
        const next = new Set(prev);
        next.delete(activeFilter);
        return next;
      });
    }
    setActiveFilter(null);
  };

  // Get all selected filters as an array for displaying chips
  const selectedFilters = useMemo(() => {
    const filterPills = [];

    selectedCategories.forEach(cat => {
      const subcats = SUBCATEGORIES[cat] ?? [];
      const hasSubcats = subcats.some(subcat => selectedTypes.has(`${cat}::${subcat}`));

      if (hasSubcats) {
        subcats.forEach(subcat => {
          if (selectedTypes.has(`${cat}::${subcat}`)) {
            filterPills.push(`${cat} · ${subcat}`);
          }
        });
      } else {
        filterPills.push(cat);
      }
    });

    selectedTypes.forEach(typeKey => {
      const [cat, type] = typeKey.split('::');
      if (!selectedCategories.has(cat)) {
        filterPills.push(`${cat} · ${type}`);
      }
    });

    return filterPills;
  }, [selectedCategories, selectedTypes]);

  // === Lógica de filtros (client-side post-filtering) ===
  const filteredEvents = useMemo(() => {
    let list = eventsApiData;

    // "Ahora" (Live) filter — requires real-time client-side check
    if (selectedDateTag === 'Ahora') {
      list = list.filter((e) => isLive(e));
    }

    const hasCategoryFilters = selectedCategories.size > 0;
    const hasTypeFilters = selectedTypes.size > 0;

    if (hasCategoryFilters || hasTypeFilters) {
      list = list.filter((e) => {
        const evCatCanonical = normalizeCategory(e?.category);
        const evTypeNormalized = normalizeEventType(e?.type);

        const matchesCategory = hasCategoryFilters && selectedCategories.has(evCatCanonical);

        const eventTypeKey = `${evCatCanonical}::${evTypeNormalized}`;
        const matchesType = hasTypeFilters && selectedTypes.has(eventTypeKey);

        return matchesCategory || matchesType;
      });
    }

    return list;
  }, [eventsApiData, selectedDateTag, selectedCategories, selectedTypes]);

  // Check if a filter category is active
  const isFilterActive = (filterName) => {
    if (filterName === 'Fecha') return selectedDateTag !== 'ALL';
    return selectedCategories.has(filterName) || Array.from(selectedTypes).some(key => key.startsWith(`${filterName}::`));
  };

  const renderFilterButton = (filterName, IconComponent) => {
    const active = isFilterActive(filterName);
    return (
      <TouchableOpacity
        onPress={() => setActiveFilter(filterName)}
        activeOpacity={0.7}
      >
        {active ? (
          <LinearGradient
            colors={[colors.authGradientStart, colors.authGradientEnd]}
            style={styles.filterButton}
          >
            <IconComponent color="#fff" size={20} />
          </LinearGradient>
        ) : (
          <View style={styles.filterButton}>
            <IconComponent color={colors.textDim} size={20} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEvent = ({ item }) => {
    const category = normalizeCategory(item?.category);
    const catColor = categoryColors[category] || colors.primary;
    const badgeBg = badgeColors[category] || 'rgba(159, 123, 255, 0.2)';

    return (
      <TouchableOpacity
        style={styles.eventCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('EventDetail', { event: item })}
      >
        {item?.image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(15, 5, 35, 0.85)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={styles.badgeText}>{category}</Text>
            </View>
            <SaveButton eventId={item.id} />
          </View>
        ) : (
          <View style={[styles.imagePlaceholder]}>
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={styles.badgeText}>{category}</Text>
            </View>
            <SaveButton eventId={item.id} />
          </View>
        )}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={2}>{item?.title || ''}</Text>
          <View style={styles.metaRow}>
            <Calendar size={13} color={colors.textDim} />
            <Text style={styles.metaText}>{formatEventDateTime(item)}</Text>
          </View>
          {!!item?.location && (
            <View style={styles.metaRow}>
              <MapPin size={13} color={colors.textDim} />
              <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
        </View>
        <LinearGradient
          colors={[catColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomAccent}
        />
      </TouchableOpacity>
    );
  };

  // Get chip category color for left accent
  const getChipCatColor = (filterStr) => {
    const cat = filterStr.split(' · ')[0];
    return categoryColors[cat] || null;
  };

  return (
    <TabScreenLayout style={styles.container}>
      <View style={styles.content}>
      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <GlassOverlay borderRadius={16} style={styles.searchGlass}>
          <View style={styles.searchInner}>
            <Search size={18} color={colors.textDim} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchBar}
              placeholder="Buscar eventos, venues o artistas"
              placeholderTextColor={colors.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => { setSearchQuery(''); setShowDropdown(false); }}
              >
                <X color={colors.primary} size={18} />
              </TouchableOpacity>
            )}
          </View>
        </GlassOverlay>

        {/* Search results dropdown */}
        {showDropdown && debouncedQuery.length > 0 && (venuesData.length > 0 || eventsApiData.length > 0) && (
          <>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowDropdown(false)}
          />
          <View style={styles.resultSection}>
            <ScrollView>
              {eventsApiData.length > 0 && (
                <View>
                  <Text style={styles.resultTitle}>Próximos Eventos</Text>
                  {eventsApiData.slice(0, 10).map((e, i) => (
                    <TouchableOpacity
                      key={`ev-${i}`}
                      style={styles.venueCard}
                      onPress={() => navigation.navigate('EventDetail', { event: e })}
                    >
                      <Text style={styles.venueName}>{e.title}</Text>
                      <Text style={styles.venueType}>{e.location}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {venuesData.length > 0 && (
                <View>
                  <Text style={styles.resultTitle}>Venues</Text>
                  {venuesData.slice(0, 10).map((v, i) => (
                    <TouchableOpacity
                      key={`venue-${i}`}
                      style={styles.venueCard}
                      onPress={() =>
                        navigation.navigate('VenueScreen', {
                          venueId: v.id,
                          venueName: v.name,
                        })
                      }
                    >
                      <Text style={styles.venueName}>{v.name}</Text>
                      <Text style={styles.venueType}>
                        {v.type}
                        {v.city ? ` · ${v.city}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
          </>
        )}
      </View>

      {/* Filter icons row */}
      <View style={styles.filtersRow}>
        {renderFilterButton('Fecha', Calendar)}
        {renderFilterButton('Música', Music)}
        {renderFilterButton('Teatro', Drama)}
        {renderFilterButton('Comedia', Laugh)}
        {renderFilterButton('Arte', Palette)}
        {renderFilterButton('Cine', Clapperboard)}
      </View>

      {/* Active filter chips */}
      {selectedFilters.length > 0 && (
        <View style={styles.activeChipsRow}>
          <ScrollView ref={dragRef} horizontal showsHorizontalScrollIndicator={false}>
            {selectedFilters.map((f) => {
              const catColor = getChipCatColor(f);
              return (
                <View key={f} style={styles.chip}>
                  {catColor && <View style={[styles.chipAccent, { backgroundColor: catColor }]} />}
                  <Text style={styles.chipText}>{f}</Text>
                  <TouchableOpacity onPress={() => removeFilter(f)} style={styles.chipClose}>
                    <X size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              );
            })}
            <TouchableOpacity onPress={clearAllFilters} style={[styles.chip, styles.clearAllChip]}>
              <Text style={[styles.chipText, { fontFamily: 'Outfit_600SemiBold' }]}>Limpiar todo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Filter options modal */}
      <Modal transparent visible={!!activeFilter} animationType="fade">
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPressOut={() => setActiveFilter(null)}
        >
          <GlassOverlay borderRadius={16} style={styles.modalContainer}>
            {/* Clear button */}
            <TouchableOpacity
              onPress={clearActiveFilterCategory}
              style={styles.modalClearButton}
            >
              <Text style={styles.modalClearButtonText}>Limpiar</Text>
            </TouchableOpacity>

            {/* Fecha: single select */}
            {activeFilter === 'Fecha' && (FILTERS[activeFilter] || []).map((option) => {
              const selected = selectedDateTag === option;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => toggleDateTag(option)}
                >
                  {selected ? (
                    <LinearGradient
                      colors={[colors.authGradientStart, colors.authGradientEnd]}
                      style={styles.modalOption}
                    >
                      <Text style={styles.modalOptionText}>{option}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.modalOption}>
                      <Text style={styles.modalOptionText}>{option}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Category subcategories */}
            {activeFilter && activeFilter !== 'Fecha' && (() => {
              const subcats = SUBCATEGORIES[activeFilter];
              if (!subcats) return null;

              return (
                <>
                  {/* Category toggle */}
                  <TouchableOpacity onPress={() => toggleCategory(activeFilter)}>
                    {selectedCategories.has(activeFilter) ? (
                      <LinearGradient
                        colors={[colors.authGradientStart, colors.authGradientEnd]}
                        style={[styles.modalOption, styles.modalCategoryOption]}
                      >
                        <Text style={styles.modalCategoryOptionText}>{activeFilter}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.modalOption, styles.modalCategoryOption]}>
                        <Text style={styles.modalCategoryOptionText}>{activeFilter}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Subcategories */}
                  {subcats.map((option) => {
                    const typeKey = `${activeFilter}::${option}`;
                    const selected = selectedTypes.has(typeKey);
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => toggleType(option)}
                      >
                        {selected ? (
                          <LinearGradient
                            colors={[colors.authGradientStart, colors.authGradientEnd]}
                            style={styles.modalOption}
                          >
                            <Text style={styles.modalOptionText}>{option}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.modalOption}>
                            <Text style={styles.modalOptionText}>{option}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </>
              );
            })()}
          </GlassOverlay>
        </TouchableOpacity>
      </Modal>

      {/* Loading state */}
      {isLoading && (
        <GlassOverlay borderRadius={12} style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Cargando eventos…</Text>
        </GlassOverlay>
      )}

      {/* Empty state */}
      {!isLoading && filteredEvents.length === 0 && (
        <GlassOverlay borderRadius={12} style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No hay eventos desde hoy en adelante</Text>
          <Text style={styles.emptySubtitle}>Prueba quitando algunos filtros o busca de nuevo.</Text>
        </GlassOverlay>
      )}

      {/* Event list */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => `${item.id}`}
        contentContainerStyle={{ paddingBottom: 20 }}
        style={{ flex: 1 }}
      />
      </View>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  content: { flex: 1, width: '100%' },

  // Search
  searchWrapper: {
    position: 'relative',
    marginBottom: 0,
    zIndex: 10,
  },
  searchGlass: {
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
    marginLeft: 6,
  },

  // Filter buttons
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 12,
  },
  filterButton: {
    backgroundColor: colors.glassLight,
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },

  // Active chips
  activeChipsRow: {
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassLight,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  chipAccent: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  clearAllChip: {
    backgroundColor: colors.glassLight,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    marginRight: 6,
  },
  chipClose: {
    padding: 2,
  },

  // Search results dropdown
  resultSection: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    zIndex: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    maxHeight: 280,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      android: { elevation: 8 },
      ios: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.35)' },
    }),
  },
  resultTitle: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  venueCard: {
    backgroundColor: colors.glassLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  venueName: {
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  venueType: {
    color: colors.textDim,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },

  // Event cards
  eventCard: {
    backgroundColor: 'rgba(28, 10, 62, 0.82)',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.35)' },
    }),
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 160,
  },
  imagePlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: colors.card,
  },
  saveBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1A1A34',
    borderWidth: 1.5,
    borderColor: 'rgba(191, 160, 255, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  saveBtnActive: {
    backgroundColor: '#2D1566',
    borderColor: '#BFA0FF',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  saveBtnTextActive: {
    color: '#BFA0FF',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  eventInfo: {
    padding: 12,
  },
  eventTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.textDim,
  },
  bottomAccent: {
    height: 2,
  },

  // Modal
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  modalContainer: {
    padding: 12,
  },
  modalClearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.glassLight,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalClearButtonText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
  },
  modalCategoryOption: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.glassLight,
  },
  modalCategoryOptionText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },

  // Empty/loading
  emptyState: {
    alignItems: 'center',
    marginTop: 24,
    padding: 20,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
});
