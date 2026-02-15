import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import colors from '../../theme/colors';

export default function StyledInput({ icon: Icon, ...inputProps }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        { borderColor: isFocused ? colors.authInputBorderFocus : colors.authInputBorder },
      ]}
    >
      {Icon && (
        <Icon
          size={18}
          color={isFocused ? '#BFA0FF' : '#8a8a9a'}
          style={styles.icon}
        />
      )}
      <TextInput
        style={styles.input}
        placeholderTextColor="#8a8a9a"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 52,
    backgroundColor: colors.authInputBg,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    height: '100%',
  },
});
