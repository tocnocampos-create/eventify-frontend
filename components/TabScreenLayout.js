import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from './FloatingTabBar';

/**
 * Layout wrapper for screens rendered inside the bottom tab navigator.
 * Adds bottom padding so scrollable content clears the floating tab bar.
 */
export default function TabScreenLayout({ children, style, edges = ['top'] }) {
  return (
    <SafeAreaView style={[styles.root, style]} edges={edges}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      maxWidth: 600,
      width: '100%',
      marginHorizontal: 'auto',
    }),
  },
  inner: {
    flex: 1,
    paddingBottom: TAB_BAR_HEIGHT + 24,
  },
});
