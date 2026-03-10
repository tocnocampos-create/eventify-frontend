# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eventify is a cross-platform (iOS, Android, Web) event discovery app built with **React Native + Expo**. It displays cultural events (music, theater, comedy, art, cinema) on an interactive map in a Spanish-language UI. Currently an MVP with static embedded data (no backend API).

## Commands

- `yarn start` — Start Expo dev server
- `yarn android` — Run on Android
- `yarn ios` — Run on iOS
- `yarn web` — Run web version

## Architecture

**Navigation:** React Navigation with a root Stack (Login → MainTabs). MainTabs is a 5-tab bottom navigator (Home, Events, Search, Notifications, Profile), each tab containing its own Stack with shared routes for EventDetail and VenueScreen.

**Data layer:** All data is static, imported from `data/events.js` (~3700 events), `data/venues.js` (~1400 venues), and `data/barrios.js` (neighborhood polygons with metadata). Screens use local `useState` for UI state.

**Server state:** `@tanstack/react-query` (React Query) is used for async server operations. `QueryClientProvider` wraps the app in `App.js`, with the client configured in `api/queryClient.js` (1 retry, 5min stale time). Currently used via `useMutation` for auth flows (login in `LoginScreen.js`, register in `RegisterScreen.js`).

**Filtering system:** `utils/filtering.js` is the core filter engine. It supports date tags (Live/Today/This Week/This Month), categories, event types, and specific day overrides. `utils/filters.schema.js` handles normalization with accent-stripping for Spanish text matching. `isLive()` checks if an event is currently happening (±1h before start, +2h default duration).

**Platform-specific maps:** `components/NativeMap.native.js` uses react-native-maps; `components/NativeMap.web.js` and `components/WebMap.js` use Google Maps JS API for web.

**Preview freeze system:** For Vercel preview deployments, `hooks/usePreviewFreeze.js` + `utils/freezeConfig.js` overlay a freeze on selected screens (Profile, Notifications, Search) controlled by environment variables.

## Key Conventions

- **Styling:** React Native `StyleSheet.create()` with centralized color tokens in `theme/colors.js` (dark purple backgrounds, `#9B5DE5`/`#BFA0FF` primary accents, `#00A3FF` cyan secondary)
- **Icons:** Mix of `lucide-react-native` and `@expo/vector-icons` (Ionicons, MaterialCommunityIcons, Feather)
- **Dates:** `dayjs` with Spanish locale for display; `date-fns` also available
- **Geolocation:** `utils/geo.js` provides Haversine distance, radius checks, polygon centroid calculations
- **Venue types:** `utils/venueTypes.js` normalizes venue type strings with legacy mapping support
- **All components are functional** using React hooks
- **Spanish-language UI** — category names, labels, and data are in Spanish
