import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLeads } from '../hooks/useLeads';
import { useCallRecording } from '../hooks/useCallRecording';
import LeadCard from '../components/LeadCard';
import { Lead, LeadStatus, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_FILTERS: { label: string; value: LeadStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'New', value: 'NEW' },
  { label: 'Contacted', value: 'CONTACTED' },
  { label: 'Qualified', value: 'QUALIFIED' },
];

const LeadsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    leads,
    isLoading,
    hasMore,
    filters,
    loadLeads,
    search,
    filterByStatus,
  } = useLeads();
  const { initiateCall } = useCallRecording();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<LeadStatus | undefined>(undefined);
  const isLoadingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  useEffect(() => {
    // Only load once on mount
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      console.log('[LeadsScreen] Initial load triggered');
      loadLeads(true).then(() => {
        console.log('[LeadsScreen] Leads loaded, count:', leads.length);
      });
    }
  }, [loadLeads]);

  useEffect(() => {
    console.log('[LeadsScreen] Leads state updated, count:', leads.length, 'isLoading:', isLoading);
  }, [leads, isLoading]);

  const handleRefresh = useCallback(() => {
    isLoadingRef.current = false; // Reset on refresh
    loadLeads(true);
  }, [loadLeads]);

  const handleLoadMore = useCallback(() => {
    const now = Date.now();
    // Debounce: prevent calls within 1 second of each other
    if (now - lastLoadTimeRef.current < 1000) {
      return;
    }
    // Prevent multiple concurrent calls
    if (isLoadingRef.current || isLoading || !hasMore) {
      return;
    }
    // Prevent loading if we have no data yet (initial load in progress)
    if (leads.length === 0) {
      return;
    }
    lastLoadTimeRef.current = now;
    isLoadingRef.current = true;
    loadLeads(false).finally(() => {
      // Reset after a delay to prevent rapid re-triggering
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 500);
    });
  }, [isLoading, hasMore, loadLeads, leads.length]);

  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (text.length >= 2) {
        search(text);
      } else if (text.length === 0) {
        loadLeads(true);
      }
    },
    [search, loadLeads]
  );

  const handleFilterChange = useCallback(
    (status: LeadStatus | undefined) => {
      setActiveFilter(status);
      filterByStatus(status);
    },
    [filterByStatus]
  );

  const handleCall = useCallback(
    async (lead: Lead) => {
      const success = await initiateCall(lead);
      if (success) {
        navigation.navigate('Call', { lead });
      }
    },
    [initiateCall, navigation]
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
    if (!isLoading || !leads.length) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.label}
            style={[
              styles.filterButton,
              activeFilter === filter.value && styles.filterButtonActive,
            ]}
            onPress={() => handleFilterChange(filter.value)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.value && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Leads List */}
      <FlatList
        data={leads}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !leads.length}
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateLead')}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
  },
  filterText: {
    fontSize: 13,
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 4,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  footer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
});

export default LeadsScreen;
