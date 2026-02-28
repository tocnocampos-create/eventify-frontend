import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';

// Height of the floating tab bar including internal padding.
// Use this to add bottom insets to scrollable content so the last item isn't hidden.
export const TAB_BAR_HEIGHT = 72;
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

const ICON_MAP = {
  Home: { lib: Ionicons, name: 'map', outline: 'map-outline' },
  Events: { lib: MaterialCommunityIcons, name: 'calendar-multiselect', outline: 'calendar-multiselect' },
  Search: { lib: Feather, name: 'search', outline: 'search' },
  Notifications: { lib: Ionicons, name: 'notifications', outline: 'notifications-outline' },
  Profile: { lib: Ionicons, name: 'person', outline: 'person-outline' },
};

const SPRING_CONFIG = { damping: 15, stiffness: 150, mass: 0.8 };

function TabItem({ route, label, isFocused, onPress, onLongPress }) {
  const scale = useSharedValue(isFocused ? 1 : 0);
  const iconTranslateY = useSharedValue(isFocused ? -4 : 0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1 : 0, SPRING_CONFIG);
    iconTranslateY.value = withSpring(isFocused ? -4 : 0, SPRING_CONFIG);
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: iconTranslateY.value },
      { scale: 1 + scale.value * 0.15 },
    ],
  }));

  const animatedDotStyle = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0.5, { duration: 200 }),
    transform: [{ scale: withSpring(isFocused ? 1 : 0.85, SPRING_CONFIG) }],
  }));

  const iconDef = ICON_MAP[route.name];
  const IconComponent = iconDef.lib;
  const iconName = isFocused ? iconDef.name : iconDef.outline;
  const iconColor = isFocused ? '#BFA0FF' : 'rgba(255,255,255,0.4)';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      activeOpacity={0.7}
    >
      <Animated.View style={animatedIconStyle}>
        <IconComponent name={iconName} size={22} color={iconColor} />
      </Animated.View>

      <Animated.Text
        style={[
          styles.tabLabel,
          { color: isFocused ? '#BFA0FF' : 'rgba(255,255,255,0.4)' },
          animatedLabelStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>

      <Animated.View style={[styles.activeDot, animatedDotStyle]}>
        <LinearGradient
          colors={['#9B5DE5', '#00A3FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.dotGradient}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]}>
      <View style={styles.container}>
        {/* Glow effect behind the bar */}
        {/* <View style={styles.glowOuter} /> */}

        <LinearGradient
          colors={['rgba(28, 10, 62, 0.95)', 'rgba(15, 8, 37, 0.98)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.barGradient}
        >
          <View style={styles.innerBorder}>
            {state.routes.filter((r) => {
              const opts = descriptors[r.key].options;
              return opts.tabBarButton === undefined;
            }).map((route) => {
              const { options } = descriptors[route.key];
              const label = options.tabBarLabel ?? options.title ?? route.name;
              const actualIndex = state.routes.indexOf(route);
              const isFocused = state.index === actualIndex;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              const onLongPress = () => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              };

              return (
                <TabItem
                  key={route.key}
                  route={route}
                  label={label}
                  isFocused={isFocused}
                  onPress={onPress}
                  onLongPress={onLongPress}
                />
              );
            })}
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 420,
    position: 'relative',
  },
  glowOuter: {
    position: 'absolute',
    top: 4,
    left: 20,
    right: 20,
    bottom: -4,
    borderRadius: 28,
    backgroundColor: 'rgba(155, 93, 229, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#9B5DE5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
      web: {
        boxShadow: '0 8px 32px rgba(155, 93, 229, 0.3), 0 2px 8px rgba(0, 0, 0, 0.4)',
      },
    }),
  },
  barGradient: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  innerBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(155, 93, 229, 0.2)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 0.3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 1,
  },
  dotGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
});
