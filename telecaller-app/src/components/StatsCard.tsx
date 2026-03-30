import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: string;
  iconColor?: string;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
  subtitle?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  iconColor = '#3B82F6',
  backgroundColor = '#FFFFFF',
  textColor = '#1F2937',
  style,
  subtitle,
}) => {
  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Icon name={icon} size={24} color={iconColor} />
        </View>
      )}
      <Text style={[styles.value, { color: textColor }]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
});

export default StatsCard;
