import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../theme/colors';

export default function GlowingBackground({ children }) {
  return (
    <LinearGradient
      colors={[colors.authBg, colors.authBgMid, colors.authBgDeep]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
});
