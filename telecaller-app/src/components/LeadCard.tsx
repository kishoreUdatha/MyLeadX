import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Lead } from '../types';
import {
  formatPhoneNumber,
  formatLeadStatus,
  getLeadStatusColor,
} from '../utils/formatters';

interface LeadCardProps {
  lead: Lead;
  onCall: (lead: Lead) => void;
  onPress?: (lead: Lead) => void;
  style?: ViewStyle;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onCall, onPress, style }) => {
  const statusColor = getLeadStatusColor(lead.status);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(lead)}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{lead.name}</Text>
        <Text style={styles.phone}>{formatPhoneNumber(lead.phone)}</Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.status, { backgroundColor: statusColor + '15' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {formatLeadStatus(lead.status)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => onCall(lead)}
          activeOpacity={0.7}
        >
          <Icon name="phone" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  left: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  phone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  callBtn: {
    backgroundColor: '#2563EB',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LeadCard;
