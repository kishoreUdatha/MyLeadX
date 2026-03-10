import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCalls } from '../store/slices/callsSlice';
import {
  formatDateTime,
  formatDuration,
  formatOutcome,
  getOutcomeColor,
  formatPhoneNumber,
} from '../utils/formatters';
import { Call, CallOutcome } from '../types';

const OUTCOME_FILTERS: { label: string; value: CallOutcome | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Interested', value: 'INTERESTED' },
  { label: 'Not Int.', value: 'NOT_INTERESTED' },
  { label: 'Callback', value: 'CALLBACK' },
  { label: 'Converted', value: 'CONVERTED' },
];

const HistoryScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { calls, isLoading, pagination } = useAppSelector((state) => state.calls);

  const [activeFilter, setActiveFilter] = useState<CallOutcome | undefined>(undefined);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  useEffect(() => {
    loadCalls(true);
  }, []);

  const loadCalls = useCallback(
    (refresh: boolean = false) => {
      const page = refresh ? 1 : pagination.page + 1;
      dispatch(
        fetchCalls({
          page,
          filters: activeFilter ? { outcome: activeFilter } : undefined,
          refresh,
        })
      );
    },
    [dispatch, pagination.page, activeFilter]
  );

  const handleRefresh = useCallback(() => {
    loadCalls(true);
  }, [loadCalls]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && pagination.hasMore) {
      loadCalls(false);
    }
  }, [isLoading, pagination.hasMore, loadCalls]);

  const handleFilterChange = useCallback(
    (outcome: CallOutcome | undefined) => {
      setActiveFilter(outcome);
      dispatch(
        fetchCalls({
          page: 1,
          filters: outcome ? { outcome } : undefined,
          refresh: true,
        })
      );
    },
    [dispatch]
  );

  const toggleExpand = useCallback((callId: string) => {
    setExpandedCallId((prev) => (prev === callId ? null : callId));
  }, []);

  const renderCallItem = useCallback(
    ({ item }: { item: Call }) => {
      const isExpanded = expandedCallId === item.id;
      const outcomeColor = item.outcome ? getOutcomeColor(item.outcome) : '#6B7280';

      return (
        <TouchableOpacity
          style={styles.callCard}
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.callHeader}>
            <View style={styles.callInfo}>
              <Text style={styles.callName}>{item.leadName}</Text>
              <Text style={styles.callPhone}>{formatPhoneNumber(item.leadPhone)}</Text>
            </View>
            <View style={styles.callMeta}>
              <Text style={styles.callTime}>{formatDateTime(item.createdAt)}</Text>
              {item.outcome && (
                <View style={[styles.outcomeBadge, { backgroundColor: outcomeColor + '20' }]}>
                  <Text style={[styles.outcomeText, { color: outcomeColor }]}>
                    {formatOutcome(item.outcome)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.callStats}>
            <View style={styles.stat}>
              <Icon name="timer-outline" size={14} color="#6B7280" />
              <Text style={styles.statText}>
                {item.duration ? formatDuration(item.duration) : '--:--'}
              </Text>
            </View>
            {item.recordingUrl && (
              <View style={styles.stat}>
                <Icon name="microphone" size={14} color="#10B981" />
                <Text style={[styles.statText, { color: '#10B981' }]}>Recorded</Text>
              </View>
            )}
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#9CA3AF"
            />
          </View>

          {isExpanded && (
            <View style={styles.expandedContent}>
              {item.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{item.notes}</Text>
                </View>
              )}
              {item.transcript && (
                <View style={styles.transcriptSection}>
                  <Text style={styles.transcriptLabel}>Transcript:</Text>
                  <Text style={styles.transcriptText} numberOfLines={5}>
                    {item.transcript}
                  </Text>
                </View>
              )}
              {item.sentimentScore !== undefined && (
                <View style={styles.sentimentSection}>
                  <Text style={styles.sentimentLabel}>Sentiment Score:</Text>
                  <Text
                    style={[
                      styles.sentimentScore,
                      {
                        color:
                          item.sentimentScore >= 70
                            ? '#10B981'
                            : item.sentimentScore >= 40
                              ? '#F59E0B'
                              : '#EF4444',
                      },
                    ]}
                  >
                    {item.sentimentScore}%
                  </Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [expandedCallId, toggleExpand]
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Icon name="phone-off" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Call History</Text>
        <Text style={styles.emptySubtitle}>
          {activeFilter
            ? 'No calls match this filter'
            : 'Your call history will appear here'}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || !calls.length) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={OUTCOME_FILTERS}
          keyExtractor={(item) => item.label}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === item.value && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterChange(item.value)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === item.value && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Call List */}
      <FlatList
        data={calls}
        renderItem={renderCallItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !calls.length}
            onRefresh={handleRefresh}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 13,
    color: '#4B5563',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  callCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  callPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  callMeta: {
    alignItems: 'flex-end',
  },
  callTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  outcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  callStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  notesSection: {
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  transcriptSection: {
    marginBottom: 8,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  sentimentSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentimentLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginRight: 8,
  },
  sentimentScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default HistoryScreen;
