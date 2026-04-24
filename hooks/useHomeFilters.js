import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { applyEventFilters } from '../utils/filtering.js';
import { SUBCATEGORIES as FALLBACK_SUBCATEGORIES, normalizeCategory, normalizeEventType } from '../utils/filters.schema.js';
import { getEventPrice, formatPrice } from '../utils/mapHelpers.js';
import { useAppConfig, getCategoryNames, getSubcategories } from './useAppConfig.js';

const mapSpanishToEnglishDateTag = (spanish) => {
  const mapping = { 'Ahora': 'Live', 'Hoy': 'Today', 'Esta semana': 'This Week', 'Este mes': 'This Month', 'ALL': 'ALL' };
  return mapping[spanish] || spanish;
};

const mapSpanishToEnglishCategory = (spanish) => {
  if (spanish === 'ALL') return 'ALL';
  const normalized = normalizeCategory(spanish);
  const esToEn = {
    'Música': 'Music',
    'Teatro': 'Theater',
    'Comedia': 'Humor',
    'Arte': 'Art',
    'Cine': 'Cinema',
  };
  return esToEn[normalized] || normalized;
};

export default function useHomeFilters(eventsData, searchQuery) {
  const { data: config } = useAppConfig();
  const configSubcategories = getSubcategories(config?.categories);
  const SUBCATEGORIES = Object.keys(configSubcategories).length > 0 ? configSubcategories : FALLBACK_SUBCATEGORIES;
  const categoryNames = getCategoryNames(config?.categories) || Object.keys(FALLBACK_SUBCATEGORIES);
  const configMaxPrice = config?.max_price ?? 300000;

  const filters = useMemo(() => ({
    Date: ['Ahora', 'Hoy', 'Esta semana', 'Este mes'],
    Category: categoryNames,
  }), [categoryNames]);

  const ALL_TYPES = useMemo(() => Array.from(new Set(Object.values(SUBCATEGORIES).flat())), [SUBCATEGORIES]);

  const [selectedDateTag, setSelectedDateTag] = useState('ALL');
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [maxPrice, setMaxPrice] = useState(configMaxPrice);
  const [showPricePanel, setShowPricePanel] = useState(false);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [tempSelectedDays, setTempSelectedDays] = useState([]);
  const [showDayPicker, setShowDayPicker] = useState(false);

  // Sync maxPrice with config when it loads (only if user hasn't changed it)
  const maxPriceInitRef = useRef(true);
  useEffect(() => {
    if (maxPriceInitRef.current && configMaxPrice !== 300000) {
      setMaxPrice(configMaxPrice);
      maxPriceInitRef.current = false;
    }
  }, [configMaxPrice]);

  // Legacy single-select support
  const selectedCategory = selectedCategories.size > 0 ? Array.from(selectedCategories)[0] : 'ALL';
  const selectedType = selectedTypes.size > 0 ? Array.from(selectedTypes)[0] : 'ALL';

  const hasPriceFilter = maxPrice < configMaxPrice;
  const hasCategoryOrTypeFilters = selectedCategories.size > 0 || selectedTypes.size > 0 || hasPriceFilter;
  const hasSelectedCategory = selectedCategories.size > 0;

  const activeFilters = useMemo(() => {
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
      if (!typeKey.includes('::')) return;
      const [cat, t] = typeKey.split('::');
      if (!selectedCategories.has(cat) && t) {
        filterPills.push(`${cat} · ${t}`);
      }
    });
    return filterPills;
  }, [selectedCategories, selectedTypes]);

  const activeDateFilterDisplay = useMemo(() => {
    if (selectedDateTag === 'ALL') return null;
    switch (selectedDateTag) {
      case 'Hoy': return dayjs().format('DD MMM');
      case 'Ahora': return 'Ahora';
      case 'Esta semana': {
        const today = dayjs();
        const weekEnd = today.add(6, 'day');
        return `${today.format('DD')}-${weekEnd.format('DD MMM')}`;
      }
      case 'Este mes': return 'Este Mes';
      default: return selectedDateTag;
    }
  }, [selectedDateTag]);

  const allActiveFilters = useMemo(() => {
    const combined = [];
    activeFilters.forEach(filter => {
      combined.push({ type: 'category', label: filter, value: filter });
    });
    if (hasPriceFilter) {
      combined.push({ type: 'price', label: `Gratis - ${formatPrice(maxPrice)}`, value: 'price' });
    }
    return combined;
  }, [activeFilters, hasPriceFilter, maxPrice]);

  const availableTypes = useMemo(() => {
    if (hasSelectedCategory) {
      const allTypesWithCategory = [];
      selectedCategories.forEach(cat => {
        const types = SUBCATEGORIES[cat] ?? [];
        types.forEach(type => {
          allTypesWithCategory.push({ category: cat, type });
        });
      });
      return allTypesWithCategory;
    }
    return [];
  }, [selectedCategories, hasSelectedCategory]);

  const toggleFilter = useCallback((filter) => {
    const isDate = typeof filter === 'string' && filters.Date.includes(filter);
    const isCategory = typeof filter === 'string' && filters.Category.includes(filter);
    const isType = typeof filter === 'object' && filter.type ? true : (typeof filter === 'string' && ALL_TYPES.includes(filter));

    if (isDate) {
      const nextTag = selectedDateTag === filter ? 'ALL' : filter;
      setSelectedDateTag(nextTag);
      setSelectedDay(nextTag === 'ALL' ? currentDate.format('YYYY-MM-DD') : null);
      return { clearPins: true };
    }

    if (isCategory) {
      setSelectedCategories((prev) => {
        const next = new Set(prev);
        if (next.has(filter)) next.delete(filter);
        else next.add(filter);
        return next;
      });
      return { clearPins: true };
    }

    if (isType) {
      const typeKey = typeof filter === 'object' ? `${filter.category}::${filter.type}` : filter;
      setSelectedTypes((prev) => {
        const next = new Set(prev);
        if (next.has(typeKey)) next.delete(typeKey);
        else next.add(typeKey);
        return next;
      });
      return { clearPins: true };
    }
    return {};
  }, [selectedDateTag, currentDate, filters, ALL_TYPES]);

  const removeFilter = useCallback((filter) => {
    if (filters.Date.includes(filter)) {
      setSelectedDateTag('ALL');
      setSelectedDay(currentDate.format('YYYY-MM-DD'));
      setSelectedDays([]);
    } else if (filter.includes(' · ')) {
      const [cat, subcat] = filter.split(' · ');
      const typeKey = `${cat}::${subcat}`;
      setSelectedTypes((prev) => { const next = new Set(prev); next.delete(typeKey); return next; });
      setSelectedCategories((prev) => { const next = new Set(prev); next.delete(cat); return next; });
    } else if (filters.Category.includes(filter)) {
      setSelectedCategories((prev) => { const next = new Set(prev); next.delete(filter); return next; });
    }
    return { clearPins: true };
  }, [currentDate]);

  // Day picker handlers
  const openDayPicker = useCallback(() => {
    setTempSelectedDays([...selectedDays]);
    setShowDayPicker(true);
  }, [selectedDays]);

  const closeDayPicker = useCallback(() => setShowDayPicker(false), []);

  const handleDayToggle = useCallback((d) => {
    const dateStr = d.format('YYYY-MM-DD');
    setTempSelectedDays((prev) => {
      if (prev.includes(dateStr)) return prev.filter((day) => day !== dateStr);
      return [...prev, dateStr].sort();
    });
  }, []);

  const handleClearDays = useCallback(() => {
    setTempSelectedDays([]);
    setCurrentDate(dayjs());
    setSelectedDay(null);
    setSelectedDays([]);
  }, []);

  const handleApplyDays = useCallback(() => {
    setSelectedDays([...tempSelectedDays]);
    setSelectedDateTag('ALL');
    if (tempSelectedDays.length === 1) {
      setSelectedDay(tempSelectedDays[0]);
    } else {
      setSelectedDay(null);
    }
    if (tempSelectedDays.length > 0) {
      setCurrentDate(dayjs(tempSelectedDays[0]));
    }
    setShowDayPicker(false);
    return { resetIndex: true };
  }, [tempSelectedDays]);

  // Calendar modal handler (Airbnb-style range/single date)
  const handleCalendarApply = useCallback((days) => {
    setSelectedDays(days);
    setSelectedDateTag('ALL');
    setSelectedDay(days.length === 1 ? days[0] : null);
    if (days.length > 0) {
      setCurrentDate(dayjs(days[0]));
    } else {
      setCurrentDate(dayjs());
    }
    setShowDayPicker(false);
    return { resetIndex: true };
  }, []);

  // Sync selectedDay with currentDate when no date tag
  useEffect(() => {
    if (selectedDateTag === 'ALL') setSelectedDay(currentDate.format('YYYY-MM-DD'));
  }, [currentDate, selectedDateTag]);

  // Main filtering effect
  const filteredEvents = useMemo(() => {
    let base;

    if (selectedDays.length > 0) {
      const selectedDaysSet = new Set(selectedDays);
      base = eventsData.filter((e) => {
        if (!e?.date) return false;
        const eventDateStr = dayjs(e.date).format('YYYY-MM-DD');
        return selectedDaysSet.has(eventDateStr);
      });

      const hasCategoryFilters = selectedCategories.size > 0;
      const hasTypeFilters = selectedTypes.size > 0;
      if (hasCategoryFilters || hasTypeFilters) {
        base = base.filter((e) => {
          const evCatCanonical = normalizeCategory(e?.category);
          const evTypeNormalized = normalizeEventType(e?.type);
          const matchesCategory = hasCategoryFilters && selectedCategories.has(evCatCanonical);
          const eventTypeKey = `${evCatCanonical}::${evTypeNormalized}`;
          const matchesType = hasTypeFilters && selectedTypes.has(eventTypeKey);
          return matchesCategory || matchesType;
        });
      }
    } else {
      base = applyEventFilters(eventsData, {
        dateTag: mapSpanishToEnglishDateTag(selectedDateTag),
        category: 'ALL',
        type: 'ALL',
        specificDay: selectedDateTag === 'ALL' ? selectedDay : null,
      });

      const hasCategoryFilters = selectedCategories.size > 0;
      const hasTypeFilters = selectedTypes.size > 0;
      if (hasCategoryFilters || hasTypeFilters) {
        base = base.filter((e) => {
          const evCatCanonical = normalizeCategory(e?.category);
          const evTypeNormalized = normalizeEventType(e?.type);
          const matchesCategory = hasCategoryFilters && selectedCategories.has(evCatCanonical);
          const eventTypeKey = `${evCatCanonical}::${evTypeNormalized}`;
          const matchesType = hasTypeFilters && selectedTypes.has(eventTypeKey);
          return matchesCategory || matchesType;
        });
      }
    }

    const q = (searchQuery || '').trim().toLowerCase();
    const byText = q
      ? base.filter((e) => {
          const haystack = [e.title, e.description, e.location, e.venueName, e.type]
            .filter(Boolean).join(' ').toLowerCase();
          return haystack.includes(q);
        })
      : base;

    const byPrice = byText.filter((e) => {
      const price = getEventPrice(e);
      if (price === null || price === undefined) return true;
      return price <= maxPrice;
    });

    return byPrice.sort((a, b) => {
      const dateA = dayjs(a?.date);
      const dateB = dayjs(b?.date);
      if (!dateA.isValid()) return 1;
      if (!dateB.isValid()) return -1;
      return dateA.valueOf() - dateB.valueOf();
    });
  }, [eventsData, selectedDateTag, selectedCategories, selectedTypes, selectedDay, selectedDays, searchQuery, maxPrice]);

  return {
    // State
    selectedDateTag, setSelectedDateTag,
    selectedCategories, selectedTypes,
    selectedDay, setSelectedDay,
    selectedDays, setSelectedDays,
    maxPrice, setMaxPrice,
    showPricePanel, setShowPricePanel,
    currentDate, setCurrentDate,
    tempSelectedDays, setTempSelectedDays,
    showDayPicker, setShowDayPicker,
    selectedCategory, selectedType,
    // Computed
    hasPriceFilter, hasCategoryOrTypeFilters, hasSelectedCategory,
    activeFilters, activeDateFilterDisplay, allActiveFilters, availableTypes,
    filteredEvents,
    // Handlers
    toggleFilter, removeFilter,
    openDayPicker, closeDayPicker, handleDayToggle, handleClearDays, handleApplyDays, handleCalendarApply,
    // Constants
    filters,
    // Config-derived values
    configMaxPrice,
    priceStep: config?.price_step ?? 500,
    currency: config?.currency ?? 'CLP',
  };
}
