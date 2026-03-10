import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Call, CallOutcome } from '../types';
import { formatDuration, formatDateTime } from '../utils/formatters';

interface Props {
  call: Call;
  onPress?: () => void;
}

const OUTCOME_CONFIG: Record<CallOutcome, { icon: string; color: string; label: string }> = {
  INTERESTED: { icon: 'thumb-up', color: '#10B981', label: 'Interested' },
  NOT_INTERESTED: { icon: 'thumb-down', color: '#EF4444', label: 'Not Interested' },
  CALLBACK: { icon: 'phone-return', color: '#F59E0B', label: 'Callback' },
  CONVERTED: { icon: 'star', color: '#8B5CF6', label: 'Converted' },
  NO_ANSWER: { icon: 'phone-missed', color: '#6B7280', label: 'No Answer' },
  BUSY: { icon: 'phone-hangup', color: '#F97316', label: 'Busy' },
  WRONG_NUMBER: { icon: 'phone-off', color: '#EF4444', label: 'Wrong Number' },
  VOICEMAIL: { icon: 'voicemail', color: '#3B82F6', label: 'Voicemail' },
};

const CallHistoryItem: React.FC<Props> = ({ call, onPress }) => {
  const outcome = call.outcome ? OUTCOME_CONFIG[call.outcome] : null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.iconContainer}>
        {outcome ? (
          <Icon name={outcome.icon} size={20} color={outcome.color} />
        ) : (
          <Icon name="phone" size={20} color="#9CA3AF" />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.outcomeText}>
            {outcome?.label || 'In Progress'}
          </Text>
          <Text style={styles.dateText}>
            {formatDateTime(call.createdAt)}
          </Text>
        </View>

        <View style={styles.details}>
          {call.duration !== undefined && call.duration > 0 && (
            <View style={styles.detailItem}>
              <Icon name="timer-outline" size={14} color="#9CA3AF" />
              <Text style={styles.detailText}>
                {formatDuration(call.duration)}
              </Text>
            </View>
          )}

          {call.recordingUrl && (
            <View style={styles.detailItem}>
              <Icon name="microphone" size={14} color="#3B82F6" />
              <Text style={[styles.detailText, { color: '#3B82F6' }]}>
                Recording
              </Text>
            </View>
          )}

          {call.sentimentScore !== undefined && (
            <View style={styles.detailItem}>
              <Icon
                name={call.sentimentScore > 0.5 ? 'emoticon-happy' : 'emoticon-neutral'}
                size={14}
                color={call.sentimentScore > 0.5 ? '#10B981' : '#F59E0B'}
              />
              <Text style={styles.detailText}>
                {Math.round(call.sentimentScore * 100)}%
              </Text>
            </View>
          )}
        </View>

        {call.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {call.notes}
          </Text>
        )}
      </View>

      {onPress && (
        <Icon name="chevron-right" size={20} color="#D1D5DB" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  outcomeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  notes: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 18,
  },
});

export default CallHistoryItem;
