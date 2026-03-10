import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { GOOGLE_PLACES_API_KEY } from '../config/env';

const GOOGLE_API_KEY = GOOGLE_PLACES_API_KEY;

// Debounce helper
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Extract primary and secondary text from prediction
const formatPrediction = (prediction) => {
  const parts = prediction.structured_formatting || {};
  const primary = parts.main_text || prediction.description;
  const secondary = parts.secondary_text || '';
  return { primary, secondary };
};

// Filter predictions to show only cities and comunas
const filterRelevantTypes = (predictions) => {
  const relevantTypes = [
    'locality',
    'administrative_area_level_2',
    'administrative_area_level_3',
    'sublocality',
    'sublocality_level_1',
  ];
  
  return predictions.filter((pred) => {
    const types = pred.types || [];
    return types.some((type) => relevantTypes.includes(type));
  });
};

const GooglePlacesInput = React.forwardRef(({ 
  onPlaceSelected, 
  onTextChange,
  initialValue = '',
  placeholder = 'Buscar ciudad'
}, ref) => {
  const [query, setQuery] = useState(initialValue);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 250);

  // Update query when initialValue changes (e.g., when city is detected)
  useEffect(() => {
    if (initialValue && initialValue !== query) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    if (onTextChange) {
      onTextChange(query);
    }
  }, [query, onTextChange]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetchPlaces(debouncedQuery);
    } else {
      setPredictions([]);
      setShowDropdown(false);
    }
  }, [debouncedQuery]);

  const fetchPlaces = async (text) => {
    if (text.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      // Default to Chile, but allow other countries if user types something clearly non-Chilean
      // Check if text suggests a non-Chilean location
      const isNonChilean = text.toLowerCase().includes('buenos aires') ||
                          text.toLowerCase().includes('madrid') ||
                          text.toLowerCase().includes('paris') ||
                          text.toLowerCase().includes('new york') ||
                          text.toLowerCase().includes('london');
      
      // Default to Chile, but allow other countries
      const components = isNonChilean ? '' : 'country:cl';
      
      // Build URL with optional components parameter
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}&language=es`;
      if (components) {
        url += `&components=${components}`;
      }
      // Focus on cities and administrative areas
      url += `&types=(cities)`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const json = await res.json();
      
      if (json.status === 'OK' || json.status === 'ZERO_RESULTS') {
        const filtered = filterRelevantTypes(json.predictions || []);
        setPredictions(filtered);
        setShowDropdown(filtered.length > 0);
        setSelectedIndex(-1);
      } else {
        // Handle quota exceeded or other errors silently
        setPredictions([]);
        setShowDropdown(false);
      }
    } catch (error) {
      // Silent fallback - keep typing enabled
      console.error('Error fetching places:', error);
      setPredictions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  };

  const selectPlace = async (placeId, predictionData = null) => {
    try {
      setLoading(true);
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?placeid=${placeId}&key=${GOOGLE_API_KEY}&language=es&fields=geometry,name,address_components,formatted_address`
      );
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const json = await res.json();
      
      if (json.status !== 'OK' || !json.result) {
        throw new Error('Place details not found');
      }

      const result = json.result;
      const location = result.geometry?.location;
      
      if (!location) {
        throw new Error('No coordinates found');
      }

      // Extract city and comuna from address_components
      let city = '';
      let comuna = '';
      const addressComponents = result.address_components || [];
      
      for (const component of addressComponents) {
        const types = component.types || [];
        if (types.includes('locality')) {
          city = component.long_name || component.short_name;
        } else if (types.includes('administrative_area_level_2') || types.includes('sublocality')) {
          comuna = component.long_name || component.short_name;
        }
      }

      // Use formatted name if available
      const formattedName = predictionData 
        ? `${formatPrediction(predictionData).primary}${formatPrediction(predictionData).secondary ? ` — ${formatPrediction(predictionData).secondary}` : ''}`
        : result.name || result.formatted_address;

      // Set city and comuna appropriately
      const finalCity = city || comuna || formattedName;
      const finalComuna = comuna || city || '';

      onPlaceSelected({
        name: formattedName,
        city: finalCity,
        comuna: finalComuna,
        coordinates: {
          latitude: location.lat,
          longitude: location.lng,
        },
        rawText: query,
      });

      setQuery(formattedName);
      setPredictions([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error fetching place details:', error);
      // Fallback: still update the query with the selected text
      if (predictionData) {
        const formatted = formatPrediction(predictionData);
        const displayName = `${formatted.primary}${formatted.secondary ? ` — ${formatted.secondary}` : ''}`;
        setQuery(displayName);
        onPlaceSelected({
          name: displayName,
          city: formatted.primary,
          comuna: formatted.secondary,
          coordinates: null,
          rawText: query,
          error: 'No se pudieron obtener coordenadas',
        });
      }
      setPredictions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (!showDropdown || predictions.length === 0) return;

    if (e.nativeEvent.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < predictions.length - 1 ? prev + 1 : prev
      );
    } else if (e.nativeEvent.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.nativeEvent.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = predictions[selectedIndex];
      selectPlace(selected.place_id, selected);
    } else if (e.nativeEvent.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  // Expose method to parent component via ref
  React.useImperativeHandle(ref, () => ({
    getValue: () => query,
  }), [query]);
  
  // Update query when initialValue changes
  useEffect(() => {
    if (initialValue && initialValue !== query) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setSelectedIndex(-1);
          }}
          onKeyPress={handleKeyPress}
          onFocus={() => {
            if (predictions.length > 0) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => {
            // Delay hiding dropdown to allow selection
            setTimeout(() => setShowDropdown(false), 200);
          }}
        />
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#6A39FF" />
          </View>
        )}
      </View>
      
      {showDropdown && predictions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item, index }) => {
              const formatted = formatPrediction(item);
              const isSelected = index === selectedIndex;
              
              return (
                <TouchableOpacity
                  style={[
                    styles.item,
                    isSelected && styles.itemSelected,
                  ]}
                  onPress={() => selectPlace(item.place_id, item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.itemPrimary}>{formatted.primary}</Text>
                  {formatted.secondary && (
                    <Text style={styles.itemSecondary}>{formatted.secondary}</Text>
                  )}
                </TouchableOpacity>
              );
            }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            style={styles.dropdownList}
          />
        </View>
      )}
    </View>
  );
});

export default GooglePlacesInput;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
    marginBottom: 10,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#2C005F',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingRight: 40,
    fontSize: 16,
    color: '#fff',
    borderColor: '#6A39FF',
    borderWidth: 1,
  },
  loaderContainer: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#2C005F',
    borderRadius: 10,
    borderColor: '#6A39FF',
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  dropdownList: {
    maxHeight: 200,
  },
  item: {
    backgroundColor: 'transparent',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(106, 57, 255, 0.2)',
  },
  itemSelected: {
    backgroundColor: '#3E2670',
  },
  itemPrimary: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  itemSecondary: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 2,
  },
});
