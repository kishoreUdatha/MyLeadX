import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { formatDuration } from '../utils/formatters';

interface CallTimerProps {
  seconds: number;
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
}

const CallTimer: React.FC<CallTimerProps> = ({ seconds, style, size = 'medium' }) => {
  const fontSize = size === 'large' ? 48 : size === 'medium' ? 32 : 20;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.timer, { fontSize }]}>{formatDuration(seconds)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    fontWeight: '600',
    color: '#1F2937',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
});

export default CallTimer;
