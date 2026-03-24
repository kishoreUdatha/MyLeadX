import React, { useEffect, useCallback, useRef } from 'react';
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
import { getGreeting, formatDuration } from '../utils/formatters';
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
  const hasInitializedRef = useRef(false);
  const isLoadingRef = useRef(false);

  const loadStats = useCallback(() => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    dispatch(fetchStats()).finally(() => {
      isLoadingRef.current = false;
    });
  }, [dispatch]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      loadStats();
    }
  }, [loadStats]);

  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => {
            isLoadingRef.current = false;
            loadStats();
          }}
          colors={['#2563EB']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{firstName}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName.charAt(0)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Start Calling */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => navigation.navigate('Leads')}
        activeOpacity={0.8}
      >
        <Icon name="phone-outline" size={20} color="#FFF" />
        <Text style={styles.ctaText}>Start Calling</Text>
        <View style={styles.ctaBadge}>
          <Text style={styles.ctaBadgeText}>{stats?.assignedLeads ?? 0}</Text>
        </View>
      </TouchableOpacity>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.todayCalls ?? 0}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.conversionRate ?? 0}%</Text>
          <Text style={styles.statLabel}>Conversion</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.totalCalls ?? 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {stats?.averageCallDuration ? formatDuration(Math.round(stats.averageCallDuration)) : '-'}
          </Text>
          <Text style={styles.statLabel}>Avg</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('History')}>
          <Icon name="history" size={20} color="#64748B" />
          <Text style={styles.actionText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Analytics')}>
          <Icon name="chart-line" size={20} color="#64748B" />
          <Text style={styles.actionText}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Leads')}>
          <Icon name="account-group-outline" size={20} color="#64748B" />
          <Text style={styles.actionText}>Leads</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Settings')}>
          <Icon name="cog-outline" size={20} color="#64748B" />
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Performance */}
      {stats?.callsByOutcome && Object.keys(stats.callsByOutcome).length > 0 && (
        <View style={styles.performance}>
          <Text style={styles.sectionLabel}>Today's Outcomes</Text>
          {Object.entries(stats.callsByOutcome).map(([outcome, count]) => (
            <View key={outcome} style={styles.outcomeRow}>
              <Text style={styles.outcomeName}>
                {outcome.replace('_', ' ').toLowerCase()}
              </Text>
              <Text style={styles.outcomeCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 13,
    color: '#94A3B8',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  ctaBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ctaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  actions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  actionText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  performance: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
  },
  outcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  outcomeName: {
    fontSize: 14,
    color: '#475569',
    textTransform: 'capitalize',
  },
  outcomeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
});

export default DashboardScreen;
