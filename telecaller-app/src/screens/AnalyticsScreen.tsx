import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, CallOutcome } from '../types';
import { useAppSelector, useAppDispatch } from '../store';
import { fetchStats } from '../store/slices/authSlice';

type Props = NativeStackScreenProps<RootStackParamList, 'Analytics'>;

const { width } = Dimensions.get('window');

const OUTCOME_COLORS: Record<CallOutcome, string> = {
  INTERESTED: '#10B981',
  NOT_INTERESTED: '#EF4444',
  CALLBACK: '#F59E0B',
  CONVERTED: '#8B5CF6',
  NO_ANSWER: '#6B7280',
  BUSY: '#F97316',
  WRONG_NUMBER: '#EF4444',
  VOICEMAIL: '#3B82F6',
};

const TIME_PERIODS = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  subValue,
  color,
  trend,
  trendValue,
}) => (
  <View style={styles.metricCard}>
    <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}>
      <Icon name={icon} size={24} color={color} />
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
    {subValue && <Text style={styles.metricSubValue}>{subValue}</Text>}
    {trend && trendValue && (
      <View style={styles.trendContainer}>
        <Icon
          name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'minus'}
          size={14}
          color={trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280'}
        />
        <Text
          style={[
            styles.trendText,
            { color: trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280' },
          ]}
        >
          {trendValue}
        </Text>
      </View>
    )}
  </View>
);

interface OutcomeBarProps {
  outcome: CallOutcome;
  count: number;
  total: number;
}

const OutcomeBar: React.FC<OutcomeBarProps> = ({ outcome, count, total }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const color = OUTCOME_COLORS[outcome];

  return (
    <View style={styles.outcomeRow}>
      <View style={styles.outcomeLabelContainer}>
        <View style={[styles.outcomeDot, { backgroundColor: color }]} />
        <Text style={styles.outcomeLabel}>{outcome.replace('_', ' ')}</Text>
      </View>
      <View style={styles.outcomeBarContainer}>
        <View style={[styles.outcomeBar, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.outcomeCount}>{count}</Text>
    </View>
  );
};

const AnalyticsScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCalls: 0,
    todayCalls: 0,
    conversionRate: 0,
    averageCallDuration: 0,
    assignedLeads: 0,
    completedLeads: 0,
    callsByOutcome: {} as Record<CallOutcome, number>,
  });

  const loadStats = useCallback(async () => {
    try {
      // In a real app, this would fetch stats based on the selected period
      const result = await dispatch(fetchStats()).unwrap();
      if (result) {
        setStats(result);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, selectedPeriod]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getTotalOutcomeCalls = (): number => {
    return Object.values(stats.callsByOutcome).reduce((sum, count) => sum + count, 0);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {TIME_PERIODS.map((period) => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.periodButton,
              selectedPeriod === period.value && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period.value)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period.value && styles.periodButtonTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            icon="phone"
            label="Total Calls"
            value={stats.totalCalls}
            color="#3B82F6"
            trend="up"
            trendValue="+12%"
          />
          <MetricCard
            icon="phone-check"
            label="Today's Calls"
            value={stats.todayCalls}
            color="#10B981"
          />
          <MetricCard
            icon="chart-line"
            label="Conversion Rate"
            value={`${stats.conversionRate.toFixed(1)}%`}
            color="#8B5CF6"
            trend="up"
            trendValue="+2.5%"
          />
          <MetricCard
            icon="clock-outline"
            label="Avg Duration"
            value={formatDuration(stats.averageCallDuration)}
            color="#F59E0B"
          />
        </View>
      </View>

      {/* Lead Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lead Statistics</Text>
        <View style={styles.leadStatsCard}>
          <View style={styles.leadStatRow}>
            <View style={styles.leadStatItem}>
              <Icon name="account-multiple" size={24} color="#3B82F6" />
              <View style={styles.leadStatContent}>
                <Text style={styles.leadStatValue}>{stats.assignedLeads}</Text>
                <Text style={styles.leadStatLabel}>Assigned Leads</Text>
              </View>
            </View>
            <View style={styles.leadStatDivider} />
            <View style={styles.leadStatItem}>
              <Icon name="account-check" size={24} color="#10B981" />
              <View style={styles.leadStatContent}>
                <Text style={styles.leadStatValue}>{stats.completedLeads}</Text>
                <Text style={styles.leadStatLabel}>Completed</Text>
              </View>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      stats.assignedLeads > 0
                        ? (stats.completedLeads / stats.assignedLeads) * 100
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {stats.assignedLeads > 0
                ? ((stats.completedLeads / stats.assignedLeads) * 100).toFixed(0)
                : 0}
              % Complete
            </Text>
          </View>
        </View>
      </View>

      {/* Call Outcomes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call Outcomes</Text>
        <View style={styles.outcomesCard}>
          {Object.entries(stats.callsByOutcome).length > 0 ? (
            Object.entries(stats.callsByOutcome).map(([outcome, count]) => (
              <OutcomeBar
                key={outcome}
                outcome={outcome as CallOutcome}
                count={count}
                total={getTotalOutcomeCalls()}
              />
            ))
          ) : (
            <View style={styles.emptyOutcomes}>
              <Icon name="chart-bar" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No call data yet</Text>
            </View>
          )}
        </View>
      </View>

      {/* Performance Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Tips</Text>
        <View style={styles.tipsCard}>
          <View style={styles.tipItem}>
            <View style={styles.tipIcon}>
              <Icon name="lightbulb" size={20} color="#F59E0B" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Increase your callback rate</Text>
              <Text style={styles.tipText}>
                Try calling leads back within 24 hours for better conversion.
              </Text>
            </View>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipIcon}>
              <Icon name="target" size={20} color="#10B981" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Focus on qualified leads</Text>
              <Text style={styles.tipText}>
                Prioritize leads with higher engagement scores for better results.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  metricLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  metricSubValue: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  leadStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  leadStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leadStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  leadStatContent: {
    flex: 1,
  },
  leadStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  leadStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'right',
  },
  outcomesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  outcomeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    gap: 8,
  },
  outcomeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  outcomeLabel: {
    fontSize: 12,
    color: '#374151',
    textTransform: 'capitalize',
  },
  outcomeBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  outcomeBar: {
    height: '100%',
    borderRadius: 4,
  },
  outcomeCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    width: 30,
    textAlign: 'right',
  },
  emptyOutcomes: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  tipItem: {
    flexDirection: 'row',
    gap: 12,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 32,
  },
});

export default AnalyticsScreen;
