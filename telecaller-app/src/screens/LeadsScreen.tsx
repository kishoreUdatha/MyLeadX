import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
  StatusBar,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useLeads } from '../hooks/useLeads';
import { useCallRecording } from '../hooks/useCallRecording';
import { leadsApi } from '../api/leads';
import LeadCard from '../components/LeadCard';
import { Lead, LeadStatus, LeadsStats, RootStackParamList, STORAGE_KEYS, isTeamLeadOrAbove } from '../types';
import { DateRangeType } from '../components/DateRangeFilter';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Conversion tabs like web
type ConversionTab = 'all' | 'active' | 'converted';

interface StatusFilter {
  label: string;
  value: LeadStatus | 'ALL';
  icon: string;
  color: string;
}

const STATUS_FILTERS: StatusFilter[] = [
  { label: 'All', value: 'ALL', icon: 'format-list-bulleted', color: '#6B7280' },
  { label: 'New', value: 'NEW', icon: 'star-four-points', color: '#3B82F6' },
  { label: 'Contacted', value: 'CONTACTED', icon: 'phone-check', color: '#F59E0B' },
  { label: 'Qualified', value: 'QUALIFIED', icon: 'check-decagram', color: '#8B5CF6' },
  { label: 'Negotiation', value: 'NEGOTIATION', icon: 'handshake', color: '#EC4899' },
  { label: 'Converted', value: 'CONVERTED', icon: 'trophy', color: '#10B981' },
  { label: 'Lost', value: 'LOST', icon: 'close-circle', color: '#EF4444' },
];

const DATE_FILTERS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
];

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

const LeadsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    leads,
    isLoading,
    hasMore,
    loadLeads,
  } = useLeads();
  const { initiateCall } = useCallRecording();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [conversionTab, setConversionTab] = useState<ConversionTab>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [customDates, setCustomDates] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });
  const [userRole, setUserRole] = useState<string>('telecaller');
  const [showTeamLeads, setShowTeamLeads] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  const isTeamLead = isTeamLeadOrAbove(userRole);

  // Load user role
  useEffect(() => {
    const loadRole = async () => {
      try {
        const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (userData) {
          const user = JSON.parse(userData);
          setUserRole(user.role || 'telecaller');
        }
      } catch (e) {
        if (__DEV__) console.log('[LeadsScreen] Error loading role:', e);
      }
    };
    loadRole();
  }, []);

  // Stats from server (lifecycle counts) — drives tab badges + conversion totals.
  const [stats, setStats] = useState<LeadsStats | null>(null);

  // Translate UI filters into the single `status` param the backend understands.
  // Status filter wins; otherwise the conversion tab maps to ACTIVE/CONVERTED.
  const getEffectiveStatus = useCallback((): LeadStatus | 'ALL' => {
    if (activeFilter !== 'ALL') return activeFilter;
    if (conversionTab === 'converted') return 'CONVERTED' as LeadStatus;
    if (conversionTab === 'active') return 'ACTIVE' as any;
    return 'ALL';
  }, [activeFilter, conversionTab]);

  const getDateParams = useCallback(() => {
    const dates = getDateRange(dateRange, customDates);
    return {
      dateFrom: dates?.startDate?.toISOString().split('T')[0],
      dateTo: dates?.endDate?.toISOString().split('T')[0],
    };
  }, [dateRange, customDates]);

  // doFetch reads the latest state via a ref so we can put it behind a stable
  // debounced effect without triggering re-fetches on every render's callback
  // identity churn (the old useFocusEffect deps caused 2–3 requests per tap).
  const doFetchRef = useRef<() => void>(() => {});
  doFetchRef.current = () => {
    const effectiveStatus = getEffectiveStatus();
    const dateParams = getDateParams();
    const search = searchQuery.length >= 2 ? searchQuery : undefined;
    loadLeads(true, showTeamLeads, { status: effectiveStatus, ...dateParams, search });
    leadsApi
      .getLeadsStats({ showTeam: showTeamLeads, ...dateParams })
      .then(setStats)
      .catch(err => { if (__DEV__) console.log('[LeadsScreen] Stats fetch failed:', err); });
  };

  // Single signature string of all server-side filters. The effect re-fires
  // only when one of these actually changes, not on every render.
  const filterSig =
    `${activeFilter}|${conversionTab}|${dateRange}` +
    `|${customDates.startDate?.toISOString() ?? ''}` +
    `|${customDates.endDate?.toISOString() ?? ''}` +
    `|${showTeamLeads}|${searchQuery}`;

  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    // Fire immediately on first mount, debounce subsequent changes (so typing
    // in the search box coalesces to one request).
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      doFetchRef.current();
      return;
    }
    const t = setTimeout(() => doFetchRef.current(), 300);
    return () => clearTimeout(t);
  }, [filterSig]);

  // Re-fetch on re-focus (e.g. coming back from CallScreen) — but skip the
  // initial focus, since the signature effect above already loaded the data.
  const skipFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      doFetchRef.current();
    }, [])
  );

  // Server already filtered — render the loaded page directly.
  const displayLeads = leads;

  const conversionCounts = {
    all: stats?.total ?? 0,
    active: stats?.active ?? 0,
    converted: stats?.converted ?? 0,
  };

  const statusCounts: Record<string, number> = {
    ALL: conversionTab === 'converted' ? (stats?.converted ?? 0)
       : conversionTab === 'active'    ? (stats?.active ?? 0)
       : (stats?.total ?? 0),
    NEW: stats?.new ?? 0,
    CONTACTED: stats?.contacted ?? 0,
    QUALIFIED: stats?.qualified ?? 0,
    NEGOTIATION: stats?.negotiation ?? 0,
    CONVERTED: stats?.converted ?? 0,
    LOST: stats?.lost ?? 0,
  };

  const handleDateRangeChange = useCallback(
    (range: DateRangeType, dates?: { startDate: Date | null; endDate: Date | null }) => {
      setDateRange(range);
      if (dates) {
        setCustomDates(dates);
      }
    },
    []
  );

  const handleRefresh = useCallback(() => {
    isLoadingRef.current = false; // Reset on refresh
    doFetchRef.current();
  }, []);

  const handleLoadMore = useCallback(() => {
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 1000) return;
    if (isLoadingRef.current || isLoading || !hasMore) return;
    if (displayLeads.length === 0) return;

    lastLoadTimeRef.current = now;
    isLoadingRef.current = true;
    const search = searchQuery.length >= 2 ? searchQuery : undefined;
    loadLeads(false, showTeamLeads, {
      status: getEffectiveStatus(),
      ...getDateParams(),
      search,
    }).finally(() => {
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 500);
    });
  }, [isLoading, hasMore, loadLeads, displayLeads.length, showTeamLeads, getEffectiveStatus, getDateParams, searchQuery]);

  // The debounced signature effect re-fetches whenever searchQuery changes —
  // no need to fire a request here on every keystroke.
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Tab change now triggers a server-side refetch via useFocusEffect's deps
  // (getEffectiveStatus changes → focus effect re-runs).
  const handleFilterChange = useCallback(
    (status: LeadStatus | 'ALL') => {
      setActiveFilter(status);
    },
    []
  );

  const handleCall = useCallback(
    (lead: Lead) => {
      // Navigate to CallScreen which handles recording and call tracking
      navigation.navigate('Call', { lead });
    },
    [navigation]
  );

  const handleLeadPress = useCallback(
    (lead: Lead) => {
      navigation.navigate('LeadDetail', { leadId: lead.id });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Lead }) => (
      <LeadCard
        lead={item}
        onCall={handleCall}
        onPress={handleLeadPress}
      />
    ),
    [handleCall, handleLeadPress]
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Icon name="account-search" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Leads Found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery
            ? 'Try a different search term'
            : 'No leads assigned to you yet'}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || !displayLeads.length) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  };

  const activeFilterCount = activeFilter !== 'ALL' || dateRange !== 'all' ? 1 : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Row - Like web */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Leads</Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{conversionCounts.all}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateLead')}
        >
          <Icon name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>New Lead</Text>
        </TouchableOpacity>
      </View>

      {/* Conversion Tabs - Like web (All, Active, Converted) */}
      <View style={styles.conversionTabs}>
        <TouchableOpacity
          style={[styles.conversionTab, conversionTab === 'all' && styles.conversionTabActive]}
          onPress={() => { setConversionTab('all'); setActiveFilter('ALL'); }}
        >
          <Text style={[styles.conversionTabText, conversionTab === 'all' && styles.conversionTabTextActive]}>
            All Leads
          </Text>
          <View style={[styles.conversionBadge, conversionTab === 'all' && styles.conversionBadgeActive]}>
            <Text style={[styles.conversionBadgeText, conversionTab === 'all' && styles.conversionBadgeTextActive]}>
              {conversionCounts.all}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.conversionTab, conversionTab === 'active' && styles.conversionTabActive]}
          onPress={() => { setConversionTab('active'); setActiveFilter('ALL'); }}
        >
          <Text style={[styles.conversionTabText, conversionTab === 'active' && styles.conversionTabTextActive]}>
            Active
          </Text>
          <View style={[styles.conversionBadge, conversionTab === 'active' && styles.conversionBadgeActive]}>
            <Text style={[styles.conversionBadgeText, conversionTab === 'active' && styles.conversionBadgeTextActive]}>
              {conversionCounts.active}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.conversionTab, conversionTab === 'converted' && styles.conversionTabActive]}
          onPress={() => { setConversionTab('converted'); setActiveFilter('ALL'); }}
        >
          <Text style={[styles.conversionTabText, conversionTab === 'converted' && styles.conversionTabTextActive]}>
            Converted
          </Text>
          <View style={[styles.conversionBadge, conversionTab === 'converted' && styles.conversionBadgeActive]}>
            <Text style={[styles.conversionBadgeText, conversionTab === 'converted' && styles.conversionBadgeTextActive]}>
              {conversionCounts.converted}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Team Toggle for Team Leads */}
      {isTeamLead && (
        <View style={styles.teamToggleContainer}>
          <TouchableOpacity
            style={[styles.teamToggleBtn, !showTeamLeads && styles.teamToggleBtnActive]}
            onPress={() => setShowTeamLeads(false)}
          >
            <Text style={[styles.teamToggleText, !showTeamLeads && styles.teamToggleTextActive]}>
              My Leads
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.teamToggleBtn, showTeamLeads && styles.teamToggleBtnActive]}
            onPress={() => setShowTeamLeads(true)}
          >
            <Text style={[styles.teamToggleText, showTeamLeads && styles.teamToggleTextActive]}>
              Team
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar with Filter Button - Like web */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, email..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Icon name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon name="filter-variant" size={18} color={activeFilterCount > 0 ? '#FFFFFF' : '#6B7280'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBtnBadge}>
              <Text style={styles.filterBtnBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {(activeFilter !== 'ALL' || dateRange !== 'all') && (
        <View style={styles.activeFiltersRow}>
          {activeFilter !== 'ALL' && (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>
                Status: {STATUS_FILTERS.find(f => f.value === activeFilter)?.label}
              </Text>
              <TouchableOpacity onPress={() => setActiveFilter('ALL')}>
                <Icon name="close" size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
          {dateRange !== 'all' && (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>
                Date: {DATE_FILTERS.find(f => f.key === dateRange)?.label}
              </Text>
              <TouchableOpacity onPress={() => handleDateRangeChange('all')}>
                <Icon name="close" size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={styles.clearAllBtn}
            onPress={() => { setActiveFilter('ALL'); handleDateRangeChange('all'); }}
          >
            <Text style={styles.clearAllBtnText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {displayLeads.length} {displayLeads.length === 1 ? 'lead' : 'leads'}
        </Text>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Status Filter */}
            <Text style={styles.filterSectionTitle}>Status</Text>
            <View style={styles.filterOptions}>
              {STATUS_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterOption,
                    activeFilter === filter.value && styles.filterOptionActive,
                  ]}
                  onPress={() => setActiveFilter(filter.value)}
                >
                  <Icon
                    name={filter.icon}
                    size={16}
                    color={activeFilter === filter.value ? '#FFFFFF' : filter.color}
                  />
                  <Text
                    style={[
                      styles.filterOptionText,
                      activeFilter === filter.value && styles.filterOptionTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                  <Text style={[
                    styles.filterOptionCount,
                    activeFilter === filter.value && styles.filterOptionCountActive,
                  ]}>
                    {statusCounts[filter.value] || 0}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date Filter */}
            <Text style={styles.filterSectionTitle}>Date Range</Text>
            <View style={styles.filterOptions}>
              {DATE_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterOption,
                    dateRange === filter.key && styles.filterOptionActive,
                  ]}
                  onPress={() => handleDateRangeChange(filter.key as DateRangeType)}
                >
                  <Icon
                    name="calendar"
                    size={16}
                    color={dateRange === filter.key ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.filterOptionText,
                      dateRange === filter.key && styles.filterOptionTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalClearBtn}
                onPress={() => {
                  setActiveFilter('ALL');
                  handleDateRangeChange('all');
                }}
              >
                <Text style={styles.modalClearBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalApplyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Leads List */}
      <FlatList
        data={displayLeads}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !displayLeads.length}
            onRefresh={handleRefresh}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  // Header Row - Like web
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  totalBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Conversion Tabs - Like web
  conversionTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  conversionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  conversionTabActive: {
    borderBottomColor: '#4F46E5',
  },
  conversionTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  conversionTabTextActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  conversionBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  conversionBadgeActive: {
    backgroundColor: '#EEF2FF',
  },
  conversionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  conversionBadgeTextActive: {
    color: '#4F46E5',
  },
  // Team Toggle
  teamToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  teamToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  teamToggleBtnActive: {
    backgroundColor: '#4F46E5',
  },
  teamToggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  teamToggleTextActive: {
    color: '#FFFFFF',
  },
  // Search Row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    padding: 0,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#4F46E5',
  },
  filterBtnBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Active Filters Row
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  activeFilterChipText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  clearAllBtn: {
    marginLeft: 'auto',
  },
  clearAllBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  // Results Row
  resultsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  // List
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterOptionActive: {
    backgroundColor: '#4F46E5',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  filterOptionCount: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterOptionCountActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  modalClearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalClearBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  modalApplyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default LeadsScreen;
