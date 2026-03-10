import React from 'react';
import { Platform, View } from 'react-native';

if (Platform.OS !== 'web') {
  var NativeSlider = require('@react-native-community/slider').default;
}

export default function CrossPlatformSlider({
  minimumValue,
  maximumValue,
  step,
  value,
  onValueChange,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
}) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ paddingVertical: 8 }}>
        <input
          type="range"
          min={minimumValue}
          max={maximumValue}
          step={step}
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: 4,
            WebkitAppearance: 'none',
            appearance: 'none',
            background: `linear-gradient(to right, ${minimumTrackTintColor} 0%, ${minimumTrackTintColor} ${((value - minimumValue) / (maximumValue - minimumValue)) * 100}%, ${maximumTrackTintColor} ${((value - minimumValue) / (maximumValue - minimumValue)) * 100}%, ${maximumTrackTintColor} 100%)`,
            borderRadius: 2,
            outline: 'none',
            cursor: 'pointer',
            accentColor: thumbTintColor,
          }}
        />
      </View>
    );
  }

  return (
    <NativeSlider
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      value={value}
      onValueChange={onValueChange}
      minimumTrackTintColor={minimumTrackTintColor}
      maximumTrackTintColor={maximumTrackTintColor}
      thumbTintColor={thumbTintColor}
    />
  );
}
