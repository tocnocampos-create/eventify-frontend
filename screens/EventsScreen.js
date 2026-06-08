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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import TabScreenLayout from '../components/TabScreenLayout';
import GlassOverlay from '../components/home/GlassOverlay';
import DateSelector from '../components/home/DateSelector';
import CinemaShowtimeSheet from '../components/CinemaShowtimeSheet';
import { useSearch } from '../hooks/useSearch';
import useDragScroll from '../hooks/useDragScroll';
import { useNavigation } from '@react-navigation/native';
import { groupCinemaEvents, getCinemaSchedule, formatScheduleDate } from '../utils/cinemaGrouping';
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

import { SUBCATEGORIES as FALLBACK_SUBCATEGORIES, normalizeEventType } from '../utils/filters.schema.js';

// ── Pill-category keyword filter ──────────────────────────────────────────────
const PILL_CATEGORY_FILTER_MAP = {
  'Nacional':       { keywords: ['folclore', 'folklore', 'cueca', 'música nacional',
                                  'banda chilena', 'artista chileno', 'cumbia chilena', 'latin folk'] },
  'Vida Nocturna':  { keywords: ['vida nocturna', 'dj', 'club', 'boliche', 'after', 'nocturno'] },
  'Al aire libre':  { keywords: ['aire libre', 'outdoor', 'parque', 'festival', 'anfiteatro'] },
  'Festivales':     { keywords: ['festival', 'aire libre', 'outdoor', 'anfiteatro'] },
  'Barrios':        { keywords: ['barrio italia', 'lastarria', 'bellavista', 'brasil', 'yungay',
                                  'patrimonio', 'ruta cultural'] },
  'City Tour':      { keywords: ['city tour', 'tour', 'turismo', 'visita guiada',
                                  'centro histórico', 'ruta patrimonial', 'la moneda'] },
  'Familiar':       { keywords: ['familiar', 'infantil', 'niños', 'kids', 'todas las edades'] },
  'Sunsets':        { keywords: ['sunset', 'atardecer', 'happy hour', 'rooftop', 'terraza'] },
  'Ferias':         { keywords: ['feria', 'mercado', 'bazar', 'food market'] },
  'Jazz':           { keywords: ['jazz', 'blues', 'swing'], types: ['Jazz'] },
  'Música':         { keywords: ['música', 'concierto', 'rock', 'pop', 'electrónica', 'jazz', 'latin'],
                      categories: ['Música'] },
  'Comedia':        { keywords: ['comedia', 'stand up', 'humor'], categories: ['Comedia'] },
  'Teatro':         { keywords: ['teatro', 'obra', 'drama', 'tragicomedia', 'monólogo'],
                      categories: ['Teatro'] },
  'Cine':           { keywords: ['cine', 'película', 'film', 'proyección'],
                      categories: ['Cine'] },
  'Museos':         { keywords: ['museo', 'colección'] },
  'Galerías':       { keywords: ['galería', 'arte', 'exposición'] },
};

/**
 * Pills that declare explicit `categories` (Teatro, Comedia, Cine) match ONLY
 * on event.category to avoid keyword false positives from venue names.
 */
function getCategoryFilter(categoryKey) {
  const spec = PILL_CATEGORY_FILTER_MAP[categoryKey];
  if (!spec) return null;
  return (event) => {
    if (spec.categories?.length) {
      const catLower = (event.category || '').toLowerCase();
      return spec.categories.some(c => c.toLowerCase() === catLower);
    }
    const kwsLower = (event.keywords || []).map(k => k.toLowerCase());
    if (spec.keywords?.some(kw => kwsLower.includes(kw.toLowerCase()))) return true;
    const typeLower = (event.type || '').toLowerCase();
    if (spec.types?.some(t => t.toLowerCase() === typeLower)) return true;
    return false;
  };
}

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

const EVENTS_PER_PAGE = 50;

const CINE_BLUE = '#3B52D8';
const CINE_LIGHT = 'rgba(59, 82, 216, 0.15)';
const CINE_BORDER = 'rgba(59, 82, 216, 0.3)';

export default function EventsScreen({ route }) {
  const initialCategory = route?.params?.initialCategory;
  const initialQuery = route?.params?.initialQuery;

  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery || '');
  const [cinemaSheetGroup, setCinemaSheetGroup] = useState(null);
  const [activeFilter, setActiveFilter] = useState(initialCategory || null);
  const [selectedCategories, setSelectedCategories] = useState(
    initialCategory ? new Set([initialCategory]) : new Set()
  );
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [showDropdown, setShowDropdown] = useState(false);
  const [paramsApplied, setParamsApplied] = useState(false);
  const [visibleCount, setVisibleCount] = useState(EVENTS_PER_PAGE);
  const [venueTypeFilter, setVenueTypeFilter] = useState(route?.params?.initialVenueType || null);
  const [pillTimeFilter, setPillTimeFilter] = useState(route?.params?.pillTimeFilter || null);
  const [pillKeywordFilter, setPillKeywordFilter] = useState(route?.params?.pillKeywordFilter || null);
  const [pillCategoryKey, setPillCategoryKey] = useState(route?.params?.pillCategoryKey || null);

  const navigation = useNavigation();

  useEffect(() => {
    if (!route?.params) return;
    if (paramsApplied) return;
    if (route.params.initialCategory) {
      setActiveFilter(route.params.initialCategory);
      setSelectedCategories(new Set([route.params.initialCategory]));
    }
    if (route.params.initialQuery) {
      setSearchQuery(route.params.initialQuery);
      setDebouncedQuery(route.params.initialQuery);
    }
    if (route.params.initialTypes) {
      setSelectedTypes(new Set(route.params.initialTypes));
    }
    if (route.params.initialVenueType) {
      setVenueTypeFilter(route.params.initialVenueType);
    }
    if (route.params.pillTimeFilter) {
      setPillTimeFilter(route.params.pillTimeFilter);
    }
    if (route.params.pillKeywordFilter) {
      setPillKeywordFilter(route.params.pillKeywordFilter);
    }
    if (route.params.pillCategoryKey) {
      setPillCategoryKey(route.params.pillCategoryKey);
    }
    setParamsApplied(true);
  }, [route?.params]);

  const dragRef = useDragScroll();
  const { data: config } = useAppConfig();
  const badgeColors = getCategoryBadgeColors(config?.categories);
  const configSubcategories = getSubcategories(config?.categories);
  const SUBCATEGORIES = Object.keys(configSubcategories).length > 0 ? configSubcategories : FALLBACK_SUBCATEGORIES;
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

  const searchParams = useMemo(() => {
    const dateStr = selectedDate.format('YYYY-MM-DD');
    const pillSpec = pillCategoryKey ? PILL_CATEGORY_FILTER_MAP[pillCategoryKey] : null;
    const isCategoryPill = pillSpec?.categories?.length > 0;
    return {
      q: debouncedQuery || undefined,
      venueType: venueTypeFilter || undefined,
      keywordCategory: (pillCategoryKey && !isCategoryPill) ? pillCategoryKey : undefined,
      eventCategory: isCategoryPill ? pillSpec.categories[0] : undefined,
      startDate: dateStr,
      endDate: dateStr,
      returnType: 'both',
      limit: 500,
    };
  }, [debouncedQuery, selectedDate, venueTypeFilter, pillCategoryKey]);

  const { data: searchData, isLoading } = useSearch(searchParams);
  const venuesData = searchData?.venues ?? [];
  const eventsApiData = searchData?.events ?? [];

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

  const toggleType = (type, category = null) => {
    const cat = category || activeFilter;
    const typeKey = cat ? `${cat}::${type}` : type;
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

  const removeFilter = (filter) => {
    if (filter.includes(' · ')) {
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

  const clearAllFilters = () => {
    setSelectedCategories(new Set());
    setSelectedTypes(new Set());
    setSelectedDate(dayjs());
    setPillCategoryKey(null);
    setPillKeywordFilter(null);
    setPillTimeFilter(null);
    setVenueTypeFilter(null);
  };

  const clearActiveFilterCategory = () => {
    if (activeFilter && SUBCATEGORIES[activeFilter]) {
      const subcats = SUBCATEGORIES[activeFilter];
      setSelectedTypes((prev) => {
        const next = new Set(prev);
        subcats.forEach(subcat => {
          next.delete(`${activeFilter}::${subcat}`);
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

  const filteredEventsRaw = useMemo(() => {
    let list = eventsApiData;

    if (pillCategoryKey) {
      const pillFilter = getCategoryFilter(pillCategoryKey);
      if (pillFilter) {
        list = list.filter(pillFilter);
      }
    } else {
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
    }

    if (pillTimeFilter === 'evening') {
      list = list.filter((e) => {
        if (!e.timeStart) return false;
        const hour = parseInt(e.timeStart.split(':')[0], 10);
        return !isNaN(hour) && hour >= 18;
      });
    }

    if (pillKeywordFilter && pillKeywordFilter.length > 0) {
      list = list.filter((e) => {
        const searchable = [e.title, e.description, ...(e.keywords || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return pillKeywordFilter.some((kw) => searchable.includes(kw.toLowerCase()));
      });
    }

    return list;
  }, [eventsApiData, selectedCategories, selectedTypes,
      pillTimeFilter, pillKeywordFilter, pillCategoryKey]);

  const filteredEvents = useMemo(
    () => groupCinemaEvents(filteredEventsRaw),
    [filteredEventsRaw],
  );

  useEffect(() => {
    setVisibleCount(EVENTS_PER_PAGE);
  }, [filteredEvents]);

  const isFilterActive = (filterName) => {
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

  const renderCinemaGroup = ({ item, index }) => {
    const todaySchedule = getCinemaSchedule(item.showtimes || [], 1)[0];
    const totalShowtimes = (item.showtimes || []).length;
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify().damping(15).stiffness(150)}>
        <Pressable
          style={({ pressed }) => [styles.eventCard, styles.cinemaCard, pressed && { transform: [{ scale: 0.97 }] }]}
          onPress={() => navigation.navigate('EventDetail', { event: item })}
        >
          <View style={styles.cinemaRow}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.cinemaPoster} resizeMode="cover" />
            ) : (
              <View style={[styles.cinemaPoster, styles.cinemaPosterPlaceholder]}>
                <Ionicons name="film-outline" size={24} color={CINE_BLUE} />
              </View>
            )}

            <View style={styles.cinemaInfo}>
              <View style={[styles.badge, { backgroundColor: colors.badgeCine, alignSelf: 'flex-start', marginBottom: 6 }]}>
                <Text style={styles.badgeText}>Cine</Text>
              </View>
              <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
              {!!(item.venueName || item.location) && (
                <View style={styles.metaRow}>
                  <MapPin size={12} color={colors.textDim} />
                  <Text style={styles.metaText} numberOfLines={1}>{item.venueName || item.location}</Text>
                </View>
              )}
              <Text style={styles.cinemaShowtimeCount}>
                {totalShowtimes} {totalShowtimes === 1 ? 'función disponible' : 'funciones disponibles'}
              </Text>
            </View>
          </View>

          {todaySchedule && (
            <View style={styles.cinemaSchedulePreview}>
              {todaySchedule.formats.slice(0, 3).map(({ format, times }) => (
                <View key={format} style={styles.cinemaFormatRow}>
                  <Text style={styles.cinemaFormatLabel}>{format}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cinemaTimePills}>
                    {times.slice(0, 6).map((t) => (
                      <View key={t} style={styles.cinemaTimePill}>
                        <Text style={styles.cinemaTimePillText}>{t}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.verHorariosRow}
            onPress={(e) => { e.stopPropagation?.(); setCinemaSheetGroup(item); }}
            activeOpacity={0.8}
          >
            <Text style={styles.verHorariosText}>Ver todos los horarios</Text>
            <Ionicons name="chevron-forward" size={14} color="#A0B4FF" />
          </TouchableOpacity>

          <LinearGradient
            colors={[CINE_BLUE, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.bottomAccent}
          />
        </Pressable>
      </Animated.View>
    );
  };

  const renderEvent = ({ item, index }) => {
    const category = normalizeCategory(item?.category);
    const catColor = categoryColors[category] || colors.primary;
    const badgeBg = badgeColors[category] || 'rgba(159, 123, 255, 0.2)';

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify().damping(15).stiffness(150)}>
      <Pressable
        style={({ pressed }) => [styles.eventCard, pressed && { transform: [{ scale: 0.97 }] }]}
        onPress={() => navigation.navigate('EventDetail', { event: item })}
      >
        {item?.image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(15, 5, 35, 0.85)']}
              style={StyleSheet.absoluteFillObject}
            />
            {!!category && (
              <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                <Text style={styles.badgeText}>{category}</Text>
              </View>
            )}
            <SaveButton eventId={item.id} />
          </View>
        ) : (
          <View style={[styles.imagePlaceholder]}>
            {!!category && (
              <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                <Text style={styles.badgeText}>{category}</Text>
              </View>
            )}
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
      </Pressable>
      </Animated.View>
    );
  };

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

      {/* Date selector row */}
      <View style={styles.dateSelectorRow}>
        <DateSelector
          currentDate={selectedDate}
          onPrev={() => {
            setSelectedDate(prev => prev.subtract(1, 'day'));
            setVisibleCount(EVENTS_PER_PAGE);
          }}
          onNext={() => {
            setSelectedDate(prev => prev.add(1, 'day'));
            setVisibleCount(EVENTS_PER_PAGE);
          }}
          onPress={() => {}}
          activeDateFilterDisplay={undefined}
          selectedDays={[]}
        />
      </View>

      {/* Category filter icons row */}
      <View style={styles.filtersRow}>
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

      {/* Filter options modal (categories only) */}
      <Modal transparent visible={!!activeFilter} animationType="fade">
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPressOut={() => setActiveFilter(null)}
        >
          <GlassOverlay borderRadius={16} style={styles.modalContainer}>
            <TouchableOpacity
              onPress={clearActiveFilterCategory}
              style={styles.modalClearButton}
            >
              <Text style={styles.modalClearButtonText}>Limpiar</Text>
            </TouchableOpacity>

            {activeFilter && SUBCATEGORIES[activeFilter] && (() => {
              const subcats = SUBCATEGORIES[activeFilter];
              return (
                <>
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
          <Text style={styles.emptyTitle}>No hay eventos para este día</Text>
          <Text style={styles.emptySubtitle}>Prueba otro día o quita algunos filtros.</Text>
        </GlassOverlay>
      )}

      {/* Event list */}
      <FlatList
        data={filteredEvents.slice(0, visibleCount)}
        renderItem={renderEvent}
        keyExtractor={(item) => `${item.id}`}
        contentContainerStyle={{ paddingBottom: 20 }}
        style={{ flex: 1 }}
        ListFooterComponent={
          visibleCount < filteredEvents.length ? (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => setVisibleCount((c) => c + EVENTS_PER_PAGE)}
              activeOpacity={0.8}
            >
              <Text style={styles.loadMoreText}>Cargar más</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      </View>

      {/* Cinema showtime sheet */}
      <CinemaShowtimeSheet
        group={cinemaSheetGroup}
        visible={!!cinemaSheetGroup}
        onClose={() => setCinemaSheetGroup(null)}
      />
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  loadMoreButton: {
    alignSelf: 'center',
    marginVertical: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(159, 123, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(159, 123, 255, 0.4)',
  },
  loadMoreText: {
    color: '#BFA0FF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
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

  // Date selector
  dateSelectorRow: {
    marginTop: 14,
    marginBottom: 4,
    alignItems: 'flex-start',
  },

  // Filter buttons
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
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

  // ── Cinema group card ──────────────────────────────────────────────────────
  cinemaCard: {
    padding: 0,
  },
  cinemaRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  cinemaPoster: {
    width: 70,
    height: 100,
    borderRadius: 8,
    flexShrink: 0,
  },
  cinemaPosterPlaceholder: {
    backgroundColor: CINE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: CINE_BORDER,
  },
  cinemaInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  cinemaShowtimeCount: {
    color: '#A0B4FF',
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    marginTop: 4,
  },
  cinemaSchedulePreview: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  cinemaFormatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cinemaFormatLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    minWidth: 32,
  },
  cinemaTimePills: {
    gap: 6,
  },
  cinemaTimePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: CINE_LIGHT,
    borderWidth: 1,
    borderColor: CINE_BORDER,
  },
  cinemaTimePillText: {
    color: '#A0B4FF',
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  verHorariosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  verHorariosText: {
    color: '#A0B4FF',
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
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
