import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Platform } from 'react-native';

// Lightweight Google Maps wrapper for web
// Props:
// - initialRegion: { latitude, longitude, latitudeDelta, longitudeDelta }
// - onPress: (e) => void
// - userLocation: { latitude, longitude } | null
// - circleRadius: number | null (meters)
// - venueMarkers: Array<{ id: string, venueName: string, latitude: number, longitude: number, pinColor?: string, eventCount: number }>
// - onVenueMarkerPress: (venueMarker) => void
// - selectedEventPin: { latitude, longitude, category?: string } | null
// - selectedVenuePin: { latitude, longitude, pinColor?: string } | null
// - pinColors: { default: string, selected: string, venue: string }
// - barrios: Array<{ id: string, name: string, coordinates: Array<{latitude, longitude}>, fillColor: string, strokeColor: string }>
// - onBarrioPress: (barrio) => void - Callback when user taps a barrio polygon
// - outdoorMarkers: Array<{ name: string, type: string, latitude: number, longitude: number }>
// - onOutdoorMarkerPress: (marker) => void

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no-window'));
    if (window.google && window.google.maps) return resolve(window.google.maps);
    const existing = document.getElementById('gmaps-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'gmaps-sdk';
    script.async = true;
    script.defer = true;
    console.log('[WebMap] injecting Google Maps with apiKey:', apiKey);
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.onload = () => resolve(window.google.maps);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const WebMap = forwardRef(function WebMap(
  {
    apiKey,
    initialRegion,
    onPress,
    userLocation,
    circleRadius,
    venueMarkers,
    onVenueMarkerPress,
    selectedEventPin,
    selectedVenuePin,
    pinColors = { default: '#9F7BFF', selected: '#FFFFFF', venue: '#5FA9FF', venueSelected: '#8BC4FF' },
    style,
    onRegionChange,
    barrios = [],
    onBarrioPress,
    outdoorMarkers = [],
    onOutdoorMarkerPress,
  },
  ref
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const userCircleRef = useRef(null);
  const tempEventMarkerRef = useRef(null);
  const venueMarkerRef = useRef(null);
  const polygonsRef = useRef([]);
  const outdoorMarkersRef = useRef([]);
  const centerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const listenersRef = useRef([]);
  const onRegionChangeRef = useRef(onRegionChange);

  useEffect(() => {
    onRegionChangeRef.current = onRegionChange;
  }, [onRegionChange]);

  const notifyRegionChange = () => {
    const callback = onRegionChangeRef.current;
    if (!callback || !mapRef.current) return;
    const maps = window.google && window.google.maps;
    if (!maps) return;
    const center = mapRef.current.getCenter();
    if (!center) return;
    const zoom = mapRef.current.getZoom ? mapRef.current.getZoom() : latLngToZoom(initialRegion?.latitudeDelta);
    const latitude = center.lat();
    const longitude = center.lng();
    const latitudeDelta = zoomToLatDelta(zoom);
    const longitudeDelta = latitudeDelta;
    callback({ latitude, longitude, latitudeDelta, longitudeDelta });
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled) return;
        if (!containerRef.current) return;
        const center = new maps.LatLng(initialRegion.latitude, initialRegion.longitude);
        centerRef.current = center;
        mapRef.current = new maps.Map(containerRef.current, {
          center,
          zoom: latLngToZoom(initialRegion.latitudeDelta),
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          mapId: undefined,
        });
        listenersRef.current.forEach((listener) => listener?.remove?.());
        listenersRef.current = [];
        listenersRef.current.push(mapRef.current.addListener('idle', notifyRegionChange));
        listenersRef.current.push(mapRef.current.addListener('zoom_changed', notifyRegionChange));
        // Keep track of center on interactions so we can restore it on resize
        mapRef.current.addListener('center_changed', () => {
          const c = mapRef.current.getCenter();
          centerRef.current = c;
        });
        // Observe container resize (orientation change, responsive layout)
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserverRef.current = new ResizeObserver(() => {
            if (!mapRef.current) return;
            const current = centerRef.current;
            window.google.maps.event.trigger(mapRef.current, 'resize');
            if (current) mapRef.current.setCenter(current);
          });
          resizeObserverRef.current.observe(containerRef.current);
        } else {
          window.addEventListener('resize', handleWindowResize, { passive: true });
        }
        if (onPress) {
          mapRef.current.addListener('click', (e) => onPress(e));
        }
        renderAll();
        notifyRegionChange();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      // Google Maps API does its own cleanup when DOM node is removed
      if (resizeObserverRef.current && containerRef.current) {
        try { resizeObserverRef.current.unobserve(containerRef.current); } catch {}
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      } else {
        window.removeEventListener('resize', handleWindowResize);
      }
      listenersRef.current.forEach((listener) => listener?.remove?.());
      listenersRef.current = [];
    };
  }, []);

  useEffect(() => {
    renderAll();
  }, [userLocation, circleRadius, venueMarkers, selectedEventPin, selectedVenuePin, barrios, outdoorMarkers]);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration) => {
      const maps = window.google && window.google.maps;
      if (!maps || !mapRef.current) return;
      const center = new maps.LatLng(region.latitude, region.longitude);
      mapRef.current.panTo(center);
      const zoom = latLngToZoom(region.latitudeDelta || initialRegion.latitudeDelta);
      mapRef.current.setZoom(zoom);
      centerRef.current = center;
      notifyRegionChange();
    },
    setOptions: (options) => {
      if (!mapRef.current) return;
      mapRef.current.setOptions(options);
    },
  }));

  const renderAll = () => {
    const maps = window.google && window.google.maps;
    if (!maps || !mapRef.current) return;

    // barrios polygons (render first so they appear under markers)
    polygonsRef.current.forEach((poly) => poly.setMap(null));
    polygonsRef.current = [];
    
    if (barrios && barrios.length > 0) {
      barrios.forEach((barrio) => {
        if (!barrio.coordinates || barrio.coordinates.length === 0) return;
        try {
          const path = barrio.coordinates.map(
            (coord) => new maps.LatLng(coord.latitude, coord.longitude)
          );
          const polygon = new maps.Polygon({
            paths: path,
            fillColor: barrio.fillColor || 'rgba(159, 123, 255, 0.2)',
            fillOpacity: 1,
            strokeColor: barrio.strokeColor || 'rgba(159, 123, 255, 0.6)',
            strokeOpacity: 1,
            strokeWeight: 2,
            zIndex: 1, // Lower z-index so markers appear on top
            map: mapRef.current,
            clickable: true, // Enable click events on polygon
          });
          
          // Add click listener for barrio polygon
          // Single tap on polygon opens barrio detail panel
          if (onBarrioPress) {
            polygon.addListener('click', () => {
              onBarrioPress(barrio);
            });
          }
          
          polygonsRef.current.push(polygon);
        } catch (error) {
          if (__DEV__) console.error('[WebMap] Failed to create polygon:', error, barrio);
        }
      });
    }

    // user circle
    if (userLocation && circleRadius) {
      if (!userCircleRef.current) {
        userCircleRef.current = new maps.Circle({
          map: mapRef.current,
          strokeColor: 'rgba(24,119,242,0.25)',
          strokeOpacity: 1,
          fillColor: 'rgba(24,119,242,0.15)',
          fillOpacity: 1,
        });
      }
      userCircleRef.current.setOptions({
        center: { lat: userLocation.latitude, lng: userLocation.longitude },
        radius: Math.max(circleRadius, 30),
      });
    } else if (userCircleRef.current) {
      userCircleRef.current.setMap(null);
      userCircleRef.current = null;
    }

    // user marker
    if (userLocation) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = new maps.Marker({
          map: mapRef.current,
          optimized: true,
        });
      }
      userMarkerRef.current.setPosition({ lat: userLocation.latitude, lng: userLocation.longitude });
      userMarkerRef.current.setIcon({
        path: maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#1877F2',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      });
    } else if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    // venue markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    const markersToCreate = venueMarkers || [];
    markersToCreate.forEach((vm) => {
      const lat = typeof vm.latitude === 'number' ? vm.latitude : parseFloat(vm.latitude);
      const lng = typeof vm.longitude === 'number' ? vm.longitude : parseFloat(vm.longitude);

      if (!vm || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return;
      }

      try {
        const iconColor = vm.pinColor || pinColors?.default || '#9F7BFF';
        const marker = new maps.Marker({
          map: mapRef.current,
          position: { lat, lng },
          zIndex: 10,
          title: vm.venueName || '',
          icon: venuePinIcon(maps, iconColor, vm.eventCount || 1),
        });
        if (onVenueMarkerPress) {
          marker.addListener('click', () => {
            onVenueMarkerPress(vm);
          });
        }
        markersRef.current.push(marker);
      } catch (error) {
        if (__DEV__) console.error('[WebMap] Failed to create marker:', error, vm);
      }
    });

    // outdoor markers (al aire libre mode)
    outdoorMarkersRef.current.forEach((m) => m.setMap(null));
    outdoorMarkersRef.current = [];
    if (outdoorMarkers && outdoorMarkers.length > 0) {
      outdoorMarkers.forEach((om) => {
        const lat = typeof om.latitude === 'number' ? om.latitude : parseFloat(om.latitude);
        const lng = typeof om.longitude === 'number' ? om.longitude : parseFloat(om.longitude);
        if (isNaN(lat) || isNaN(lng)) return;
        try {
          const marker = new maps.Marker({
            map: mapRef.current,
            position: { lat, lng },
            zIndex: 10,
            title: om.name || '',
            icon: outdoorPinIcon(maps),
          });
          if (onOutdoorMarkerPress) {
            marker.addListener('click', () => onOutdoorMarkerPress(om));
          }
          outdoorMarkersRef.current.push(marker);
        } catch (error) {
          if (__DEV__) console.error('[WebMap] Failed to create outdoor marker:', error, om);
        }
      });
    }

    // selected event (temp) marker
    if (selectedEventPin) {
      if (!tempEventMarkerRef.current) {
        tempEventMarkerRef.current = new maps.Marker({ map: mapRef.current, zIndex: 998 });
      }
      tempEventMarkerRef.current.setPosition({
        lat: selectedEventPin.latitude,
        lng: selectedEventPin.longitude,
      });
      // Use category-based color if available, otherwise use selected color (white)
      const selectedColor = selectedEventPin.pinColor || pinColors.selected || pinColors.default;
      tempEventMarkerRef.current.setIcon(pinIcon(maps, selectedColor));
    } else if (tempEventMarkerRef.current) {
      tempEventMarkerRef.current.setMap(null);
      tempEventMarkerRef.current = null;
    }

    // venue marker
    if (selectedVenuePin) {
      if (!venueMarkerRef.current) {
        venueMarkerRef.current = new maps.Marker({ map: mapRef.current, zIndex: 999 });
      }
      venueMarkerRef.current.setPosition({
        lat: selectedVenuePin.latitude,
        lng: selectedVenuePin.longitude,
      });
      const venueColor = selectedVenuePin.pinColor || pinColors.venue;
      venueMarkerRef.current.setIcon(venuePinIcon(maps, venueColor, 1));
    } else if (venueMarkerRef.current) {
      venueMarkerRef.current.setMap(null);
      venueMarkerRef.current = null;
    }
  };

  const handleWindowResize = () => {
    const maps = window.google && window.google.maps;
    if (!maps || !mapRef.current) return;
    const current = centerRef.current;
    maps.event.trigger(mapRef.current, 'resize');
    if (current) mapRef.current.setCenter(current);
  };

  return <View ref={containerRef} style={[{ width: '100%', height: '100%', minHeight: 280 }, style]} />;
});

function latLngToZoom(latitudeDelta) {
  // Rough mapping of delta to zoom for web
  if (!latitudeDelta) return 13;
  const zoom = Math.round(8 - Math.log2(latitudeDelta / 0.02));
  return Math.max(3, Math.min(20, zoom));
}

const DEFAULT_PIN_HEX = '#9f7bff';
const SELECTED_PIN_HEXES = new Set(['#ffffff', 'white']);
const DEFAULT_PIN_HEXES = new Set([DEFAULT_PIN_HEX]);
const VENUE_DEFAULT_PIN_HEX = '#5fa9ff';
const VENUE_SELECTED_PIN_HEX = '#8bc4ff';
const VENUE_PIN_HEXES = new Set([VENUE_DEFAULT_PIN_HEX, VENUE_SELECTED_PIN_HEX]);
const TEATRO_PIN_HEX = '#3b82f6';
const TEATRO_PIN_HEXES = new Set([TEATRO_PIN_HEX]);
const COMEDIA_PIN_HEX = '#FF69B4'; // vibrant pink for Comedia
const COMEDIA_PIN_HEXES = new Set([COMEDIA_PIN_HEX]);
const ARTE_PIN_HEX = '#00BCD4'; // vibrant cyan/turquoise for Arte
const ARTE_PIN_HEXES = new Set([ARTE_PIN_HEX]);
const CINE_PIN_HEX = '#3B52D8'; // deep blue for Cine
const CINE_PIN_HEXES = new Set([CINE_PIN_HEX]);
const PIN_WIDTH_WEB = 36;
const PIN_HEIGHT_WEB = 46;
const PIN_ANCHOR_X = PIN_WIDTH_WEB / 2;
const PIN_LABEL_Y = 10;

const DEFAULT_PIN_SVG = `
<svg width="${PIN_WIDTH_WEB}" height="${PIN_HEIGHT_WEB}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradientDefault" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#6D2AFB" />
      <stop offset="100%" stop-color="#B580FF" />
    </linearGradient>
  </defs>
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 5.4 10.74 6.6 11.97.21.21.49.33.79.33s.58-.12.79-.33C13.6 19.74 19 14.25 19 9c0-3.87-3.13-7-7-7Z" fill="url(#gradientDefault)" stroke="#3F109B" stroke-width="1.5" />
  <circle cx="12" cy="9" r="4" fill="#FFFFFF" />
</svg>
`;

const SELECTED_PIN_SVG = `
<svg width="${PIN_WIDTH_WEB}" height="${PIN_HEIGHT_WEB}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 5.4 10.74 6.6 11.97.21.21.49.33.79.33s.58-.12.79-.33C13.6 19.74 19 14.25 19 9c0-3.87-3.13-7-7-7Z" fill="#FFFFFF" stroke="#4D1BB2" stroke-width="1.8" />
  <circle cx="12" cy="9" r="4" fill="#4D1BB2" />
</svg>
`;

const VENUE_DEFAULT_PIN_SVG = `
<svg width="${PIN_WIDTH_WEB}" height="${PIN_HEIGHT_WEB}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradientVenueDefault" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#4A99EF" />
      <stop offset="100%" stop-color="#6FB9FF" />
    </linearGradient>
  </defs>
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 5.4 10.74 6.6 11.97.21.21.49.33.79.33s.58-.12.79-.33C13.6 19.74 19 14.25 19 9c0-3.87-3.13-7-7-7Z" fill="url(#gradientVenueDefault)" stroke="#3A89DF" stroke-width="1.5" />
  <circle cx="12" cy="9" r="4" fill="#FFFFFF" />
</svg>
`;

const VENUE_SELECTED_PIN_SVG = `
<svg width="${PIN_WIDTH_WEB}" height="${PIN_HEIGHT_WEB}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 5.4 10.74 6.6 11.97.21.21.49.33.79.33s.58-.12.79-.33C13.6 19.74 19 14.25 19 9c0-3.87-3.13-7-7-7Z" fill="#FFFFFF" stroke="#7BB4EF" stroke-width="1.8" />
  <circle cx="12" cy="9" r="4" fill="#8BC4FF" />
</svg>
`;

const TEATRO_PIN_SVG = `
<svg width="${PIN_WIDTH_WEB}" height="${PIN_HEIGHT_WEB}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradientTeatro" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#3B82F6" />
    </linearGradient>
  </defs>
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 5.4 10.74 6.6 11.97.21.21.49.33.79.33s.58-.12.79-.33C13.6 19.74 19 14.25 19 9c0-3.87-3.13-7-7-7Z" fill="url(#gradientTeatro)" stroke="#1E40AF" stroke-width="1.5" />
  <circle cx="12" cy="9" r="4" fill="#FFFFFF" />
</svg>
`;

const COMEDIA_PIN_SVG = `
<svg width="${PIN_WIDTH_WEB}" height="${PIN_HEIGHT_WEB}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradientComedia" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#E91E63" />
      <stop offset="100%" stop-color="#FF69B4" />
    </linearGradient>
  </defs>
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 5.4 10.74 6.6 11.97.21.21.49.33.79.33s.58-.12.79-.33C13.6 19.74 19 14.25 19 9c0-3.87-3.13-7-7-7Z" fill="url(#gradientComedia)" stroke="#C2185B" stroke-width="1.5" />
  <circle cx="12" cy="9" r="4" fill="#FFFFFF" />
</svg>
`;

const ARTE_PIN_SVG = `
<svg width="${PIN_WIDTH_WEB}" height="${PIN_HEIGHT_WEB}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradientArte" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#0097A7" />
      <stop offset="100%" stop-color="#00BCD4" />
    </linearGradient>
  </defs>
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 5.4 10.74 6.6 11.97.21.21.49.33.79.33s.58-.12.79-.33C13.6 19.74 19 14.25 19 9c0-3.87-3.13-7-7-7Z" fill="url(#gradientArte)" stroke="#006064" stroke-width="1.5" />
  <circle cx="12" cy="9" r="4" fill="#FFFFFF" />
</svg>
`;

const OUTDOOR_PIN_SVG = `
<svg width="${PIN_WIDTH_WEB}" height="${PIN_HEIGHT_WEB}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradientOutdoor" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#22C55E" />
      <stop offset="100%" stop-color="#15803D" />
    </linearGradient>
  </defs>
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 5.4 10.74 6.6 11.97.21.21.49.33.79.33s.58-.12.79-.33C13.6 19.74 19 14.25 19 9c0-3.87-3.13-7-7-7Z" fill="url(#gradientOutdoor)" stroke="#14532D" stroke-width="1.5" />
  <circle cx="12" cy="9" r="4" fill="#FFFFFF" />
</svg>
`;

const CINE_PIN_SVG = `
<svg width="${PIN_WIDTH_WEB}" height="${PIN_HEIGHT_WEB}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradientCine" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#2E42B8" />
      <stop offset="100%" stop-color="#3B52D8" />
    </linearGradient>
  </defs>
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 5.4 10.74 6.6 11.97.21.21.49.33.79.33s.58-.12.79-.33C13.6 19.74 19 14.25 19 9c0-3.87-3.13-7-7-7Z" fill="url(#gradientCine)" stroke="#5C3E9B" stroke-width="1.5" />
  <circle cx="12" cy="9" r="4" fill="#FFFFFF" stroke="#5C3E9B" stroke-width="1" />
</svg>
`;

const OUTDOOR_PIN_ICON_URL = svgToDataUrl(OUTDOOR_PIN_SVG);
const DEFAULT_PIN_ICON_URL = svgToDataUrl(DEFAULT_PIN_SVG);
const SELECTED_PIN_ICON_URL = svgToDataUrl(SELECTED_PIN_SVG);
const VENUE_DEFAULT_PIN_ICON_URL = svgToDataUrl(VENUE_DEFAULT_PIN_SVG);
const VENUE_SELECTED_PIN_ICON_URL = svgToDataUrl(VENUE_SELECTED_PIN_SVG);
const TEATRO_PIN_ICON_URL = svgToDataUrl(TEATRO_PIN_SVG);
const COMEDIA_PIN_ICON_URL = svgToDataUrl(COMEDIA_PIN_SVG);
const ARTE_PIN_ICON_URL = svgToDataUrl(ARTE_PIN_SVG);
const CINE_PIN_ICON_URL = svgToDataUrl(CINE_PIN_SVG);

function svgToDataUrl(svg) {
  const trimmed = svg.replace(/\n/g, '').replace(/\s{2,}/g, ' ');
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(trimmed)}`;
}

function pinIcon(maps, color) {
  if (!maps) return null;
  const hex = (color || '').toString().toLowerCase();
  const isSelectedColor = SELECTED_PIN_HEXES.has(hex);
  const isVenueDefault = hex === VENUE_DEFAULT_PIN_HEX.toLowerCase();
  const isVenueSelected = hex === VENUE_SELECTED_PIN_HEX.toLowerCase();
  const isTeatro = hex === TEATRO_PIN_HEX.toLowerCase();
  const isComedia = hex === COMEDIA_PIN_HEX.toLowerCase();
  const isArte = hex === ARTE_PIN_HEX.toLowerCase();
  const isCine = hex === CINE_PIN_HEX.toLowerCase();

  if (isSelectedColor) {
    return {
      url: SELECTED_PIN_ICON_URL,
      anchor: new maps.Point(PIN_ANCHOR_X, PIN_HEIGHT_WEB),
      scaledSize: new maps.Size(PIN_WIDTH_WEB, PIN_HEIGHT_WEB),
      labelOrigin: new maps.Point(PIN_ANCHOR_X, PIN_LABEL_Y),
    };
  }

  if (isVenueSelected) {
    return {
      url: VENUE_SELECTED_PIN_ICON_URL,
      anchor: new maps.Point(PIN_ANCHOR_X, PIN_HEIGHT_WEB),
      scaledSize: new maps.Size(PIN_WIDTH_WEB, PIN_HEIGHT_WEB),
      labelOrigin: new maps.Point(PIN_ANCHOR_X, PIN_LABEL_Y),
    };
  }

  if (isVenueDefault) {
    return {
      url: VENUE_DEFAULT_PIN_ICON_URL,
      anchor: new maps.Point(PIN_ANCHOR_X, PIN_HEIGHT_WEB),
      scaledSize: new maps.Size(PIN_WIDTH_WEB, PIN_HEIGHT_WEB),
      labelOrigin: new maps.Point(PIN_ANCHOR_X, PIN_LABEL_Y),
    };
  }

  if (isTeatro) {
    return {
      url: TEATRO_PIN_ICON_URL,
      anchor: new maps.Point(PIN_ANCHOR_X, PIN_HEIGHT_WEB),
      scaledSize: new maps.Size(PIN_WIDTH_WEB, PIN_HEIGHT_WEB),
      labelOrigin: new maps.Point(PIN_ANCHOR_X, PIN_LABEL_Y),
    };
  }

  if (isComedia) {
    return {
      url: COMEDIA_PIN_ICON_URL,
      anchor: new maps.Point(PIN_ANCHOR_X, PIN_HEIGHT_WEB),
      scaledSize: new maps.Size(PIN_WIDTH_WEB, PIN_HEIGHT_WEB),
      labelOrigin: new maps.Point(PIN_ANCHOR_X, PIN_LABEL_Y),
    };
  }

  if (isArte) {
    return {
      url: ARTE_PIN_ICON_URL,
      anchor: new maps.Point(PIN_ANCHOR_X, PIN_HEIGHT_WEB),
      scaledSize: new maps.Size(PIN_WIDTH_WEB, PIN_HEIGHT_WEB),
      labelOrigin: new maps.Point(PIN_ANCHOR_X, PIN_LABEL_Y),
    };
  }

  if (isCine) {
    return {
      url: CINE_PIN_ICON_URL,
      anchor: new maps.Point(PIN_ANCHOR_X, PIN_HEIGHT_WEB),
      scaledSize: new maps.Size(PIN_WIDTH_WEB, PIN_HEIGHT_WEB),
      labelOrigin: new maps.Point(PIN_ANCHOR_X, PIN_LABEL_Y),
    };
  }

  if (DEFAULT_PIN_HEXES.has(hex) || hex.length === 0) {
    return {
      url: DEFAULT_PIN_ICON_URL,
      anchor: new maps.Point(PIN_ANCHOR_X, PIN_HEIGHT_WEB),
      scaledSize: new maps.Size(PIN_WIDTH_WEB, PIN_HEIGHT_WEB),
      labelOrigin: new maps.Point(PIN_ANCHOR_X, PIN_LABEL_Y),
    };
  }

  // For other custom colors, use path with white center circle
  const fallbackColor = color || DEFAULT_PIN_HEX;
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 5.4 10.74 6.6 11.97.21.21.49.33.79.33s.58-.12.79-.33C13.6 19.74 19 14.25 19 9c0-3.87-3.13-7-7-7z',
    fillColor: fallbackColor,
    fillOpacity: 1,
    strokeColor: '#442080',
    strokeWeight: 2,
    scale: 1.4,
    anchor: new maps.Point(12, 24),
    labelOrigin: new maps.Point(12, -6),
  };
}

function venuePinIcon(maps, color, count) {
  if (!maps) return null;
  const W = 40;
  const H = 52;
  const label = count > 1 ? (count > 99 ? '99+' : String(count)) : '';
  const centerContent = label
    ? `<text x="20" y="22" font-family="system-ui,-apple-system,Arial,sans-serif" font-size="14" font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">${label}</text>`
    : `<circle cx="20" cy="20" r="4.5" fill="rgba(255,255,255,0.9)" />`;
  const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ds" x="-20%" y="-10%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
      <feOffset dy="2" />
      <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>
  <g filter="url(#ds)">
    <path d="M20 48 L15 34 A16 16 0 1 1 25 34 Z" fill="${color}" stroke="rgba(255,255,255,0.85)" stroke-width="2.5" />
    <ellipse cx="20" cy="19" rx="13" ry="8" fill="rgba(255,255,255,0.15)" />
    ${centerContent}
  </g>
  <ellipse cx="20" cy="50" rx="5" ry="2" fill="rgba(0,0,0,0.12)" />
</svg>`;
  const url = svgToDataUrl(svg);
  return {
    url,
    anchor: new maps.Point(W / 2, H),
    scaledSize: new maps.Size(W, H),
  };
}

function outdoorPinIcon(maps) {
  if (!maps) return null;
  return {
    url: OUTDOOR_PIN_ICON_URL,
    anchor: new maps.Point(PIN_ANCHOR_X, PIN_HEIGHT_WEB),
    scaledSize: new maps.Size(PIN_WIDTH_WEB, PIN_HEIGHT_WEB),
    labelOrigin: new maps.Point(PIN_ANCHOR_X, PIN_LABEL_Y),
  };
}

function zoomToLatDelta(zoom) {
  if (zoom == null) return 0.02;
  return 0.02 * Math.pow(2, 8 - zoom);
}

// Create a custom icon for barrio text labels
function createTextLabelIcon(maps, text) {
  const fontSize = 12;
  const padding = 8;
  const borderWidth = 1;
  const textColor = '#FFFFFF';
  const bgColor = 'rgba(159, 123, 255, 0.9)';
  const borderColor = 'rgba(159, 123, 255, 1)';
  
  // Estimate text width (rough approximation: 7px per character for font-size 12)
  const estimatedTextWidth = text.length * 7;
  const svgWidth = Math.max(estimatedTextWidth + padding * 2, 80);
  const svgHeight = fontSize + padding * 2 + 4;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  
  // Escape XML special characters in text
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  // Create SVG for the label
  const svg = `
    <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-${text.replace(/[^a-zA-Z0-9]/g, '')}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
          <feOffset dx="0" dy="1" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="${bgColor}" stroke="${borderColor}" stroke-width="${borderWidth}" rx="4" filter="url(#shadow-${text.replace(/[^a-zA-Z0-9]/g, '')})"/>
      <text x="${centerX}" y="${centerY + 2}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${escapedText}</text>
    </svg>
  `;
  
  const dataUrl = svgToDataUrl(svg);
  
  return {
    url: dataUrl,
    anchor: new maps.Point(centerX, centerY), // Center of the label
    scaledSize: new maps.Size(svgWidth, svgHeight),
  };
}

export default WebMap;


