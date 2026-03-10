import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface CallButtonProps {
  onPress: () => void;
  variant?: 'start' | 'end';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  disabled?: boolean;
  label?: string;
}

const CallButton: React.FC<CallButtonProps> = ({
  onPress,
  variant = 'start',
  size = 'medium',
  style,
  disabled = false,
  label,
}) => {
  const isEnd = variant === 'end';
  const backgroundColor = isEnd ? '#EF4444' : '#22C55E';

  const sizeStyles = {
    small: { width: 50, height: 50, iconSize: 24 },
    medium: { width: 64, height: 64, iconSize: 28 },
    large: { width: 80, height: 80, iconSize: 36 },
  };

  const { width, height, iconSize } = sizeStyles[size];

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor, width, height, borderRadius: height / 2 },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Icon
        name={isEnd ? 'phone-hangup' : 'phone'}
        size={iconSize}
        color="#FFFFFF"
      />
      {label && <Text style={styles.label}>{label}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default CallButton;
