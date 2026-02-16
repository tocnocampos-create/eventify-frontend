// screens/EventsScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import TabScreenLayout from '../components/TabScreenLayout';
import { useEvents, useVenues } from '../hooks/useMapData';
import { useNavigation } from '@react-navigation/native';
import {
  Calendar,
  Music,
  Drama,        // reemplazo del ícono Theater por Drama (lucide)
  Laugh,
  Palette,
  Clapperboard,
  X,
} from 'lucide-react-native';

import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

// ✅ utilidades de filtros (solo lógica)
import { applyEventFilters } from '../utils/filtering.js';
import { SUBCATEGORIES, normalizeEventType, normalizeCategory } from '../utils/filters.schema.js';

const FILTERS = {
  Fecha: ['Ahora', 'Hoy', 'Esta semana', 'Este mes'],
  Música: SUBCATEGORIES['Música'],
  Teatro: SUBCATEGORIES['Teatro'],
  Comedia: SUBCATEGORIES['Comedia'],
  Arte: SUBCATEGORIES['Arte'],
  Cine: SUBCATEGORIES['Cine'],
};

const DATE_OPTIONS = FILTERS.Fecha;

// Mapeo de nombres en español a canónicos en inglés
const mapSpanishToEnglishDateTag = (spanish) => {
  const mapping = { 'Ahora': 'Live', 'Hoy': 'Today', 'Esta semana': 'This Week', 'Este mes': 'This Month', 'ALL': 'ALL' };
  return mapping[spanish] || spanish;
};

export default function EventsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectedDateTag, setSelectedDateTag] = useState('ALL');
  const [searchVenues, setSearchVenues] = useState([]);
  const [searchEvents, setSearchEvents] = useState([]);

  const navigation = useNavigation();

  // API data
  const { data: venuesData = [], isLoading: venuesLoading } = useVenues();
  const { data: eventsApiData = [], isLoading: eventsLoading } = useEvents(venuesData);
  const isLoading = venuesLoading || eventsLoading;

  // —————————————————————————————————————————
  // 0) Dataset base: SOLO hoy y futuro (excluye pasado)
  // —————————————————————————————————————————
  const todayStart = useMemo(() => dayjs().startOf('day'), []);
  const upcomingData = useMemo(() => {
    return (eventsApiData || []).filter((e) => {
      const d = dayjs(e?.date);
      if (!d.isValid()) return false;
      // incluye si es el mismo día de hoy (cualquier hora) o una fecha futura
      return d.isSame(todayStart, 'day') || d.isAfter(todayStart, 'day') || d.isAfter(todayStart);
    });
  }, [todayStart, eventsApiData]);

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
    // Keep modal open for multi-select
  };

  // Helper to toggle type (with category context)
  const toggleType = (type, category = null) => {
    // If category not provided, try to use activeFilter
    const cat = category || activeFilter;
    // Only create category::type key if we have a valid category context
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
    // Keep modal open for multi-select
  };

  // Helper to toggle date tag
  const toggleDateTag = (tag) => {
    setSelectedDateTag((prev) => (prev === tag ? 'ALL' : tag));
    setActiveFilter(null); // Close modal for single-select date
  };

  // Helper to remove a filter from chips
  const removeFilter = (filter) => {
    // Check if it's a date tag
    if (FILTERS.Fecha.includes(filter)) {
      setSelectedDateTag('ALL');
    } else if (filter.includes(' · ')) {
      // Remove "Category · Subcategory" pill - remove both category and subcategory in one click
      const [cat, subcat] = filter.split(' · ');
      const typeKey = `${cat}::${subcat}`;
      
      // Remove the subcategory
      setSelectedTypes((prev) => {
        const next = new Set(prev);
        next.delete(typeKey);
        return next;
      });
      
      // Also remove the category if it's selected
      setSelectedCategories((prev) => {
        const next = new Set(prev);
        next.delete(cat);
        return next;
      });
    } else if (['Música', 'Teatro', 'Comedia', 'Arte', 'Cine'].includes(filter)) {
      // Remove category-only pill
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
      // Clear all subcategories for this category
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
    
    // Process categories and types
    // For each category in selectedCategories, check if it has subcategories
    selectedCategories.forEach(cat => {
      // Check if any subcategories of this category are in selectedTypes
      const subcats = SUBCATEGORIES[cat] ?? [];
      const hasSubcats = subcats.some(subcat => selectedTypes.has(`${cat}::${subcat}`));
      
      if (hasSubcats) {
        // Add one pill per subcategory
        subcats.forEach(subcat => {
          if (selectedTypes.has(`${cat}::${subcat}`)) {
            filterPills.push(`${cat} · ${subcat}`);
          }
        });
      } else {
        // Category-only pill
        filterPills.push(cat);
      }
    });
    
    // Check for any orphaned types (types without their parent category selected)
    selectedTypes.forEach(typeKey => {
      const [cat, type] = typeKey.split('::');
      if (!selectedCategories.has(cat)) {
        filterPills.push(`${cat} · ${type}`);
      }
    });
    
    return filterPills;
  }, [selectedCategories, selectedTypes]);

  // === Búsqueda global (venues + events) ===
  useEffect(() => {
    if (!searchQuery) {
      setSearchVenues([]);
      setSearchEvents([]);
      return;
    }
    const q = searchQuery.toLowerCase();

    setSearchVenues(
      (venuesData || []).filter(
        (v) =>
          v.name?.toLowerCase().includes(q) ||
          v.type?.toLowerCase().includes(q) ||
          v.city?.toLowerCase().includes(q)
      )
    );

    setSearchEvents(
      upcomingData.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, upcomingData, venuesData]);

  // === Lógica de filtros ===
  // 1) Base por fecha usando SOLO upcomingData
  const baseByDate = useMemo(() => {
    const dateTagEn = mapSpanishToEnglishDateTag(selectedDateTag);
    return applyEventFilters(upcomingData, {
      dateTag: dateTagEn,   // Live / Today / This Week / This Month / ALL
      category: 'ALL',
      type: 'ALL',
      specificDay: null,
    });
  }, [upcomingData, selectedDateTag]);

  // 2) Búsqueda por texto + filtrado por category/type (OR logic)
  const filteredEvents = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    let list = baseByDate;

    // Apply text search
    if (q) {
      list = list.filter(
        (event) =>
          event.title?.toLowerCase().includes(q) ||
          event.description?.toLowerCase().includes(q)
      );
    }

    // Apply category/type filters (OR logic: category OR type)
    const hasCategoryFilters = selectedCategories.size > 0;
    const hasTypeFilters = selectedTypes.size > 0;

    if (hasCategoryFilters || hasTypeFilters) {
      list = list.filter((e) => {
        const evCatCanonical = normalizeCategory(e?.category);
        const evTypeNormalized = normalizeEventType(e?.type);
        
        // Check if event matches category filter
        const matchesCategory = hasCategoryFilters && selectedCategories.has(evCatCanonical);
        
        // Check if event matches type filter - need to check for "category::type" key
        const eventTypeKey = `${evCatCanonical}::${evTypeNormalized}`;
        const matchesType = hasTypeFilters && selectedTypes.has(eventTypeKey);
        
        // Match if either category or type matches
        return matchesCategory || matchesType;
      });
    }

    // redundante pero seguro: NO mostrar pasado si llegara algo por error
    list = list.filter((e) => {
      const d = dayjs(e?.date);
      return d.isValid() && (d.isSame(todayStart, 'day') || d.isAfter(todayStart));
    });

    return list;
  }, [baseByDate, searchQuery, selectedCategories, selectedTypes, todayStart]);

  // —————————————————————————————————————————
  // Formato de fecha igual a HomeScreen:
  // "D MMM YYYY" + (", HH:mm" si el string original trae hora)
  // y venue al lado con un " · "
  // —————————————————————————————————————————
  const formatDateForCard = (dateStr) => {
    const d = dayjs(dateStr);
    if (!d.isValid()) return '';
    const hasTime = /\d{1,2}:\d{2}/.test(String(dateStr));
    const base = d.format('D MMM YYYY'); // ej: "24 jul 2025"
    return hasTime ? `${base}, ${d.format('HH:mm')}` : base;
  };

  const renderEvent = ({ item }) => {
    const dateTxt = formatDateForCard(item?.date);
    const venueTxt = item?.location ? ` · ${item.location}` : '';
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => navigation.navigate('EventDetail', { event: item })}
      >
        {item?.image ? (
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, { backgroundColor: '#3E2670' }]} />
        )}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={2}>{item?.title || ''}</Text>
          <Text style={styles.eventDate} numberOfLines={1}>
            {dateTxt}{venueTxt}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };


  return (
    <TabScreenLayout style={styles.container}>
      <View style={styles.content}>
      {/* Buscador con botón Clear */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchBar}
          placeholder="Buscar eventos, venues o artistas"
          placeholderTextColor="#ccc"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <X color="#fff" size={18} />
          </TouchableOpacity>
        )}
        
        {/* Resultados de búsqueda (venues + events) - attached to search input */}
        {searchQuery.length > 0 && (searchVenues.length > 0 || searchEvents.length > 0) && (
          <View style={styles.resultSection}>
            <ScrollView>
              {searchEvents.length > 0 && (
                <View>
                  <Text style={styles.resultTitle}>Próximos Eventos</Text>
                  {searchEvents.map((e, i) => (
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

              {searchVenues.length > 0 && (
                <View>
                  <Text style={styles.resultTitle}>Venues</Text>
                  {searchVenues.map((v, i) => (
                    <TouchableOpacity
                      key={`venue-${i}`}
                      style={styles.venueCard}
                      onPress={() =>
                        navigation.navigate('VenueScreen', {
                          venueName: v.name,
                          venueType: v.type,
                          venueCity: v.city,
                          coverImage: v.coverImage,
                          profileImage: v.profileImage,
                          menuPdfUrl: v.menuPdfUrl,
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
        )}
      </View>

      {/* Filtros con íconos */}
      <View style={styles.filtersRow}>
        <TouchableOpacity 
          onPress={() => setActiveFilter('Fecha')} 
          style={[
            styles.filterButton, 
            (selectedDateTag !== 'ALL') && styles.filterButtonActive
          ]}
        >
          <Calendar color="#fff" size={20} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveFilter('Música')} 
          style={[
            styles.filterButton,
            (selectedCategories.has('Música') || Array.from(selectedTypes).some(key => key.startsWith('Música::'))) && styles.filterButtonActive
          ]}
        >
          <Music color="#fff" size={20} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveFilter('Teatro')} 
          style={[
            styles.filterButton,
            (selectedCategories.has('Teatro') || Array.from(selectedTypes).some(key => key.startsWith('Teatro::'))) && styles.filterButtonActive
          ]}
        >
          <Drama color="#fff" size={20} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveFilter('Comedia')} 
          style={[
            styles.filterButton,
            (selectedCategories.has('Comedia') || Array.from(selectedTypes).some(key => key.startsWith('Comedia::'))) && styles.filterButtonActive
          ]}
        >
          <Laugh color="#fff" size={20} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveFilter('Arte')} 
          style={[
            styles.filterButton,
            (selectedCategories.has('Arte') || Array.from(selectedTypes).some(key => key.startsWith('Arte::'))) && styles.filterButtonActive
          ]}
        >
          <Palette color="#fff" size={20} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveFilter('Cine')} 
          style={[
            styles.filterButton,
            (selectedCategories.has('Cine') || Array.from(selectedTypes).some(key => key.startsWith('Cine::'))) && styles.filterButtonActive
          ]}
        >
          <Clapperboard color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      {/* Chips de filtros activos */}
      {selectedFilters.length > 0 && (
        <View style={styles.activeChipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedFilters.map((f) => (
              <View key={f} style={styles.chip}>
                <Text style={styles.chipText}>{f}</Text>
                <TouchableOpacity onPress={() => removeFilter(f)} style={styles.chipClose}>
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={clearAllFilters} style={[styles.chip, styles.clearAllChip]}>
              <Text style={[styles.chipText, { fontWeight: '700' }]}>Limpiar todo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Modal de opciones de filtro */}
      <Modal transparent visible={!!activeFilter} animationType="fade">
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPressOut={() => setActiveFilter(null)}
        >
          <View style={styles.modalContainer}>
            {/* Show "Clear" button inside modal */}
            <TouchableOpacity
              onPress={clearActiveFilterCategory}
              style={styles.modalClearButton}
            >
              <Text style={styles.modalClearButtonText}>Limpiar</Text>
            </TouchableOpacity>

            {/* For Fecha: single select */}
            {activeFilter === 'Fecha' && (FILTERS[activeFilter] || []).map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => toggleDateTag(option)}
                style={[
                  styles.modalOption,
                  selectedDateTag === option && styles.modalOptionSelected,
                ]}
              >
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}

            {/* For categories: show category toggle + subcategories */}
            {activeFilter && activeFilter !== 'Fecha' && (() => {
              const subcats = SUBCATEGORIES[activeFilter];
              if (!subcats) return null;

              return (
                <>
                  {/* Category toggle button */}
                  <TouchableOpacity
                    onPress={() => toggleCategory(activeFilter)}
                    style={[
                      styles.modalOption,
                      selectedCategories.has(activeFilter) && styles.modalOptionSelected,
                      styles.modalCategoryOption,
                    ]}
                  >
                    <Text style={styles.modalCategoryOptionText}>{activeFilter}</Text>
                  </TouchableOpacity>

                  {/* Subcategories */}
                  {subcats.map((option) => {
                    const typeKey = `${activeFilter}::${option}`;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => toggleType(option)}
                        style={[
                          styles.modalOption,
                          selectedTypes.has(typeKey) && styles.modalOptionSelected,
                        ]}
                      >
                        <Text style={styles.modalOptionText}>{option}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>


      {/* Estado de carga */}
      {isLoading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Cargando eventos…</Text>
        </View>
      )}

      {/* Estado vacío si no hay resultados */}
      {!isLoading && filteredEvents.length === 0 && searchQuery.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No hay eventos desde hoy en adelante</Text>
          <Text style={styles.emptySubtitle}>Prueba quitando algunos filtros o busca de nuevo.</Text>
        </View>
      )}

      {/* Lista de eventos */}
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
    backgroundColor: '#1C003D',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  content: { flex: 1, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  searchWrapper: {
    position: 'relative',
    marginBottom: 0,
    zIndex: 10,
  },
  searchBar: {
    backgroundColor: '#2C005F',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
  },
  filterButton: {
    backgroundColor: '#6A39FF',
    borderRadius: 10,
    padding: 10,
  },
  filterButtonActive: {
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#A78BFA',
  },

  // chips activos
  activeChipsRow: {
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A39FF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  clearAllChip: {
    backgroundColor: '#3E2670',
  },
  chipText: {
    color: '#fff',
    fontSize: 13,
    marginRight: 6,
  },
  chipClose: {
    padding: 2,
  },

  // resultados de búsqueda flotantes - attached directly to search input
  resultSection: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    zIndex: 20,
    backgroundColor: '#2C005F',
    borderRadius: 10,
    padding: 12,
    maxHeight: 280,
    ...(Platform.OS === 'android'
      ? { elevation: 8 }
      : { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }),
  },
  resultTitle: { color: '#ccc', fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 6 },
  venueCard: { backgroundColor: '#3E2670', padding: 12, borderRadius: 10, marginBottom: 10 },
  venueName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  venueType: { color: '#ccc', fontSize: 14, marginTop: 2 },

  // tarjetas de evento (alineado a HomeScreen: título + fecha y venue en una misma línea)
  eventCard: {
    backgroundColor: '#2C005F',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  image: { width: 100, height: 100 },
  eventInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  eventTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  eventDate: { color: '#ccc', fontSize: 14, marginTop: 4 },

  // modal de opciones
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  modalContainer: { backgroundColor: '#2C005F', borderRadius: 10, padding: 10 },
  modalClearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#3E2670',
    marginBottom: 8,
    alignItems: 'center',
  },
  modalClearButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOption: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 4 },
  modalOptionSelected: { backgroundColor: '#6A39FF' },
  modalOptionText: { color: '#fff', fontSize: 16 },
  modalCategoryOption: {
    backgroundColor: '#3E2670',
    borderWidth: 2,
    borderColor: '#6A39FF',
  },
  modalCategoryOptionText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // vacío
  emptyState: {
    alignItems: 'center',
    marginTop: 24,
  },
  emptyTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#ccc',
    fontSize: 14,
  },
});
