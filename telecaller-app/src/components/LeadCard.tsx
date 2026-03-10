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
  formatRelativeTime,
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
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            <Text style={styles.name} numberOfLines={1}>
              {lead.name}
            </Text>
            {lead.company && (
              <Text style={styles.company} numberOfLines={1}>
                {lead.company}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => onCall(lead)}
            activeOpacity={0.7}
          >
            <Icon name="phone" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.phoneRow}>
          <Icon name="phone-outline" size={16} color="#6B7280" />
          <Text style={styles.phone}>{formatPhoneNumber(lead.phone)}</Text>
        </View>

        <View style={styles.footer}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {formatLeadStatus(lead.status)}
            </Text>
          </View>
          {lead.lastContactedAt && (
            <Text style={styles.lastContact}>
              Last contact: {formatRelativeTime(lead.lastContactedAt)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  company: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  callButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  phone: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastContact: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default LeadCard;
