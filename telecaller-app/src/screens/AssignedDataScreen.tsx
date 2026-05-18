import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { telecallerApi } from '../api/telecaller';
import { AssignedData, AssignedDataStats, RootStackParamList, STORAGE_KEYS, isTeamLeadOrAbove } from '../types';
import DateRangeFilter, { DateRangeType } from '../components/DateRangeFilter';
import { getDisplayName, getNameInitials } from '../utils/formatters';

const PAGE_SIZE = 50;

const TAB_DEFS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'INTERESTED', label: 'Interested' },
  { key: 'CALLBACK', label: 'Callback' },
  { key: 'NO_ANSWER', label: 'No Ans' },
  { key: 'NOT_INTERESTED', label: 'Not Int' },
  { key: 'CONVERTED', label: 'Done' },
];

const tabKeys = TAB_DEFS.map(t => t.key);

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  ALL: { color: '#6366F1', icon: 'format-list-bulleted', label: 'All' },
  NEW: { color: '#3B82F6', icon: 'phone-outline', label: 'New' },
  PENDING: { color: '#3B82F6', icon: 'phone-outline', label: 'New' },
  ASSIGNED: { color: '#3B82F6', icon: 'phone-outline', label: 'New' },
  CALLING: { color: '#F59E0B', icon: 'phone-in-talk', label: 'Calling' },
  INTERESTED: { color: '#10B981', icon: 'thumb-up', label: 'Interested' },
  NOT_INTERESTED: { color: '#EF4444', icon: 'thumb-down', label: 'Not Int.' },
  NO_ANSWER: { color: '#F59E0B', icon: 'phone-missed', label: 'No Answer' },
  CALLBACK_REQUESTED: { color: '#8B5CF6', icon: 'phone-return-outline', label: 'Callback' },
  CONVERTED: { color: '#059669', icon: 'check-circle', label: 'Converted' },
};

// Helper function to get date range
const getDateRange = (rangeType: DateRangeType, customDates?: { startDate: Date | null; endDate: Date | null }) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (rangeType) {
    case 'today':
      return { startDate: today, endDate: now };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: yesterday, endDate: today };
    case 'thisWeek':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { startDate: weekStart, endDate: now };
    case 'thisMonth':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: monthStart, endDate: now };
    case 'custom':
      if (customDates?.startDate && customDates?.endDate) {
        return { startDate: customDates.startDate, endDate: customDates.endDate };
      }
      return null;
    default:
      return null;
  }
};

const AssignedDataScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [customDates, setCustomDates] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });
  const [userRole, setUserRole] = useState<string>('telecaller');
  const [userId, setUserId] = useState<string>('');
  const [showTeamTasks, setShowTeamTasks] = useState(false);
  const [stats, setStats] = useState<AssignedDataStats | null>(null);

  const isTeamLead = isTeamLeadOrAbove(userRole);

  // Load user role and ID on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (userData) {
          const user = JSON.parse(userData);
          setUserRole(user.role || 'telecaller');
          setUserId(user.id || '');
        }
      } catch (e) {
        if (__DEV__) console.log('[AssignedDataScreen] Error loading user data:', e);
      }
    };
    loadUserData();
  }, []);

  // Paginated records — server filters by status/date, we append on scroll.
  const [allRecords, setAllRecords] = useState<AssignedData[]>([]);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const isLoadingRef = useRef(false);

  // Map UI tab key to backend status param (backend understands 'NEW' specially,
  // but uses CALLBACK_REQUESTED rather than CALLBACK).
  const tabKeyToStatus = (key: string): string | undefined => {
    if (!key || key === 'ALL') return undefined;
    if (key === 'CALLBACK') return 'CALLBACK_REQUESTED';
    return key;
  };

  // Build the shared scope filters (date + team toggle) for both list + stats.
  const buildScopeParams = useCallback(() => {
    const dates = getDateRange(dateRange, customDates);
    const dateFrom = dates?.startDate?.toISOString().split('T')[0];
    const dateTo = dates?.endDate?.toISOString().split('T')[0];

    // Team toggle (team leads only): server-side filter so the list, the
    // pagination counter, and the badge counts all stay consistent.
    let assignedToId: string | undefined;
    let excludeAssignedToId: string | undefined;
    if (isTeamLead && userId) {
      if (showTeamTasks) {
        excludeAssignedToId = userId;
      } else {
        assignedToId = userId;
      }
    }

    return { dateFrom, dateTo, assignedToId, excludeAssignedToId };
  }, [dateRange, customDates, isTeamLead, userId, showTeamTasks]);

  // Stand-alone stats refresh — used by the 30s in-screen poll so badge counts
  // stay live without disturbing the user's scroll position or wiping
  // already-loaded pages.
  const refreshStats = useCallback(async () => {
    try {
      const data = await telecallerApi.getAssignedDataStats(buildScopeParams());
      setStats(data);
    } catch {
      // Stats are non-critical; swallow errors silently.
    }
  }, [buildScopeParams]);

  const fetchPage = useCallback(async (reset: boolean) => {
    if (isLoadingRef.current) return;
    if (!reset && !hasMoreRef.current) return;
    isLoadingRef.current = true;
    if (!reset) setLoadingMore(true);

    const nextPage = reset ? 1 : pageRef.current + 1;
    const scope = buildScopeParams();
    const tabKey = tabKeys[activeTab];

    try {
      // Refresh stats in parallel with the page fetch; cheaper than two awaits.
      const [data, statsData] = await Promise.all([
        telecallerApi.getAssignedData({
          page: nextPage,
          limit: PAGE_SIZE,
          status: tabKeyToStatus(tabKey),
          ...scope,
        }),
        // Stats only need a refresh when we're resetting (filters changed or focus).
        reset ? telecallerApi.getAssignedDataStats(scope).catch(() => null) : Promise.resolve(null),
      ]);

      pageRef.current = nextPage;
      hasMoreRef.current = data.records.length === PAGE_SIZE;
      setAllRecords(prev => reset ? data.records : [...prev, ...data.records]);
      if (statsData) setStats(statsData);
    } catch (error: any) {
      if (reset) {
        setAllRecords([]);
        Alert.alert('Failed to load tasks', error?.message || 'Please check your connection and try again.');
      }
    } finally {
      isLoadingRef.current = false;
      if (!reset) setLoadingMore(false);
    }
  }, [activeTab, buildScopeParams]);

  // All filtering — status, date, team toggle — happens server-side now, so
  // the loaded records are exactly what we show.
  const displayedRecords = allRecords;

  // Server-driven counts: stats endpoint mirrors the same scope (date + team
  // toggle), so badge counts always match the underlying list.
  const tabs = TAB_DEFS.map(t => {
    let count = 0;
    if (stats) {
      switch (t.key) {
        case 'ALL': count = stats.total; break;
        case 'NEW': count = stats.new; break;
        case 'INTERESTED': count = stats.interested; break;
        case 'CALLBACK': count = stats.callback; break;
        case 'NO_ANSWER': count = stats.noAnswer; break;
        case 'NOT_INTERESTED': count = stats.notInterested; break;
        case 'CONVERTED': count = stats.converted; break;
      }
    }
    return { ...t, count };
  });

  // Stable doFetch/doRefreshStats refs so the focus effect + filter effect can
  // share latest-state closures without being torn down on every render's
  // callback identity churn (the previous deps reset the list on each filter
  // tap, including the 30s poll interval).
  const doFetchRef = useRef<(reset: boolean) => Promise<void>>(async () => {});
  doFetchRef.current = fetchPage;
  const refreshStatsRef = useRef<() => void>(() => {});
  refreshStatsRef.current = refreshStats;

  // Re-fetch whenever a server-side filter actually changes. Encoded as a
  // primitive signature so the effect doesn't re-run on every render.
  const filterSig =
    `${activeTab}|${dateRange}` +
    `|${customDates.startDate?.toISOString() ?? ''}` +
    `|${customDates.endDate?.toISOString() ?? ''}` +
    `|${showTeamTasks}|${userId}`;

  const hasLoadedOnceRef = useRef(false);
  useEffect(() => {
    if (!hasLoadedOnceRef.current) setLoading(true);
    doFetchRef.current(true).finally(() => {
      hasLoadedOnceRef.current = true;
      setLoading(false);
    });
  }, [filterSig]);

  // 30s background stats refresh — set up once, paused while unfocused.
  useFocusEffect(
    useCallback(() => {
      // Refresh stats immediately on (re)focus so badge counts reflect any
      // server-side changes that happened off-screen.
      if (hasLoadedOnceRef.current) refreshStatsRef.current();
      const pollInterval = setInterval(() => refreshStatsRef.current(), 30000);
      return () => clearInterval(pollInterval);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPage(true);
    setRefreshing(false);
  };

  const handleEndReached = useCallback(() => {
    fetchPage(false);
  }, [fetchPage]);

  const handleDateRangeChange = useCallback(
    (range: DateRangeType, dates?: { startDate: Date | null; endDate: Date | null }) => {
      setDateRange(range);
      if (dates) {
        setCustomDates(dates);
      }
    },
    []
  );

  const handleCall = useCallback((record: AssignedData) => {
    // Navigate to CallAssignedDataScreen for proper call handling with recording
    // This ensures calls are tracked in history and recordings work on all Android devices
    navigation.navigate('CallAssignedData', { data: record });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: AssignedData }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.ASSIGNED;
    const name = getDisplayName(item.firstName, item.lastName);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => handleCall(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: config.color }]}>
            <Text style={styles.avatarText}>{getNameInitials(item.firstName, item.lastName)}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
            <Text style={styles.cardPhone}>{item.phone}</Text>
            {item.callAttempts > 0 && (
              <Text style={styles.cardAttempts}>
                {item.callAttempts} attempt{item.callAttempts > 1 ? 's' : ''}
              </Text>
            )}
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
              <Icon name={config.icon} size={12} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(item)}>
              <Icon name="phone" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [handleCall]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFF" barStyle="dark-content" />

      {/* Team Toggle for Team Leads */}
      {isTeamLead && (
        <View style={styles.teamToggleContainer}>
          <TouchableOpacity
            style={[styles.teamToggleBtn, !showTeamTasks && styles.teamToggleBtnActive]}
            onPress={() => setShowTeamTasks(false)}
          >
            <Icon name="account" size={16} color={!showTeamTasks ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.teamToggleText, !showTeamTasks && styles.teamToggleTextActive]}>
              My Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.teamToggleBtn, showTeamTasks && styles.teamToggleBtnActive]}
            onPress={() => setShowTeamTasks(true)}
          >
            <Icon name="account-group" size={16} color={showTeamTasks ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.teamToggleText, showTeamTasks && styles.teamToggleTextActive]}>
              Team Tasks
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Date Range Filter */}
      <DateRangeFilter
        selectedRange={dateRange}
        onRangeChange={handleDateRangeChange}
        customDates={customDates}
      />

      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === index;
            const config = STATUS_CONFIG[tab.key] || STATUS_CONFIG.ALL;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  isActive && { backgroundColor: config.color + '15', borderColor: config.color },
                ]}
                onPress={() => setActiveTab(index)}
              >
                <Icon
                  name={config.icon}
                  size={16}
                  color={isActive ? config.color : '#6B7280'}
                />
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && { color: config.color, fontWeight: '600' },
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={[
                      styles.filterBadge,
                      { backgroundColor: isActive ? config.color : '#9CA3AF' },
                    ]}
                  >
                    <Text style={styles.filterBadgeText}>{tab.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={displayedRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator size="small" color="#6366F1" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Icon name="phone-check" size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No contacts</Text>
            <Text style={styles.emptyText}>Pull down to refresh</Text>
          </View>
        }
      />
    </View>
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
    backgroundColor: '#F3F4F6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    marginBottom: 8,
  },
  filtersList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginRight: 8,
    gap: 6,
  },
  filterTabText: {
    fontSize: 13,
    color: '#6B7280',
  },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  cardAttempts: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Team Toggle Styles
  teamToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  teamToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  teamToggleBtnActive: {
    backgroundColor: '#4F46E5',
  },
  teamToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  teamToggleTextActive: {
    color: '#FFFFFF',
  },
});

export default AssignedDataScreen;
