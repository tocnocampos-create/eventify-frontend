import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../../theme/colors';

export default function GlassOverlay({ children, style, borderRadius = 16 }) {
  return (
    <LinearGradient
      colors={[colors.glass, 'rgba(20, 8, 40, 0.85)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        { borderRadius },
        Platform.select({
          web: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
          default: {},
        }),
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
});
