import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function DividerLine({ text }) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['transparent', 'rgba(155,93,229,0.3)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.line}
      />
      <Text style={styles.text}>{text}</Text>
      <LinearGradient
        colors={['transparent', 'rgba(155,93,229,0.3)', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={styles.line}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
  },
  text: {
    color: '#8a8a9a',
    fontSize: 13,
    marginHorizontal: 12,
  },
});
