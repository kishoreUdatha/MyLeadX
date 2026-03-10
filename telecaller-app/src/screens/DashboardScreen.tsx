import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchStats } from '../store/slices/callsSlice';
import StatsCard from '../components/StatsCard';
import { getGreeting, formatPercentage, formatDuration } from '../utils/formatters';
import { MainTabParamList, RootStackParamList } from '../types';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { stats, isLoading } = useAppSelector((state) => state.calls);

  const loadStats = useCallback(() => {
    dispatch(fetchStats());
  }, [dispatch]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleStartCalling = () => {
    navigation.navigate('Leads');
  };

  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadStats} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{firstName}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Icon name="account-circle" size={40} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatsCard
            title="Today's Calls"
            value={stats?.todayCalls ?? 0}
            icon="phone-outgoing"
            iconColor="#3B82F6"
            style={styles.statsCard}
          />
          <StatsCard
            title="Conversion"
            value={formatPercentage(stats?.conversionRate ?? 0)}
            icon="chart-line"
            iconColor="#10B981"
            style={styles.statsCard}
          />
        </View>
        <View style={styles.statsRow}>
          <StatsCard
            title="Assigned Leads"
            value={stats?.assignedLeads ?? 0}
            icon="account-multiple"
            iconColor="#8B5CF6"
            style={styles.statsCard}
          />
          <StatsCard
            title="Total Calls"
            value={stats?.totalCalls ?? 0}
            icon="phone-check"
            iconColor="#F59E0B"
            style={styles.statsCard}
          />
        </View>
      </View>

      {/* Average Call Duration */}
      {stats?.averageCallDuration !== undefined && (
        <View style={styles.avgDurationCard}>
          <Icon name="timer-outline" size={24} color="#6B7280" />
          <View style={styles.avgDurationText}>
            <Text style={styles.avgDurationValue}>
              {formatDuration(Math.round(stats.averageCallDuration))}
            </Text>
            <Text style={styles.avgDurationLabel}>Avg. Call Duration</Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <TouchableOpacity
        style={[styles.actionButton, styles.primaryAction]}
        onPress={handleStartCalling}
        activeOpacity={0.8}
      >
        <Icon name="phone" size={24} color="#FFFFFF" />
        <Text style={styles.primaryActionText}>Start Calling</Text>
        <Icon name="chevron-right" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleViewHistory}
        activeOpacity={0.7}
      >
        <Icon name="history" size={24} color="#3B82F6" />
        <Text style={styles.actionButtonText}>View Call History</Text>
        <Icon name="chevron-right" size={24} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Analytics')}
        activeOpacity={0.7}
      >
        <Icon name="chart-bar" size={24} color="#8B5CF6" />
        <Text style={styles.actionButtonText}>View Analytics</Text>
        <Icon name="chevron-right" size={24} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Settings')}
        activeOpacity={0.7}
      >
        <Icon name="cog" size={24} color="#3B82F6" />
        <Text style={styles.actionButtonText}>Settings</Text>
        <Icon name="chevron-right" size={24} color="#9CA3AF" />
      </TouchableOpacity>

      {/* Today's Summary */}
      {stats?.callsByOutcome && Object.keys(stats.callsByOutcome).length > 0 && (
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <View style={styles.summaryCard}>
            {Object.entries(stats.callsByOutcome).map(([outcome, count]) => (
              <View key={outcome} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{outcome.replace('_', ' ')}</Text>
                <Text style={styles.summaryValue}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  profileButton: {
    padding: 4,
  },
  statsGrid: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statsCard: {
    flex: 1,
  },
  avgDurationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avgDurationText: {
    marginLeft: 12,
  },
  avgDurationValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  avgDurationLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  primaryAction: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  primaryActionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summarySection: {
    marginTop: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#4B5563',
    textTransform: 'capitalize',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
});

export default DashboardScreen;
