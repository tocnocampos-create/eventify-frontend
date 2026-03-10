import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet } from 'react-native';

export default function SocialButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
      <Image source={icon} style={styles.icon} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 14,
    width: '100%',
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 10,
    resizeMode: 'contain',
  },
  label: {
    fontSize: 15,
    color: '#fff',
  },
});
