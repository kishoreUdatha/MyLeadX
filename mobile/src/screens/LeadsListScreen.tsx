import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { AppDispatch, RootState } from '../store';
import { fetchMyLeads } from '../store/slices/leadSlice';
import { Lead } from '../services/lead.service';

const statusColors: Record<string, string> = {
  NEW: '#3b82f6',
  CONTACTED: '#f59e0b',
  QUALIFIED: '#10b981',
  NEGOTIATION: '#8b5cf6',
  WON: '#059669',
  LOST: '#ef4444',
  FOLLOW_UP: '#f97316',
};

export default function LeadsListScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { leads, isLoading } = useSelector((state: RootState) => state.leads);

  const loadLeads = useCallback(() => {
    dispatch(fetchMyLeads());
  }, [dispatch]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const renderLead = ({ item }: { item: Lead }) => (
    <TouchableOpacity
      style={styles.leadCard}
      onPress={() => navigation.navigate('LeadDetail' as never, { id: item.id } as never)}
    >
      <View style={styles.leadHeader}>
        <Text style={styles.leadName}>
          {item.firstName} {item.lastName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || '#9ca3af' }]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>

      <View style={styles.leadInfo}>
        <Text style={styles.phone}>{item.phone}</Text>
        {item.email && <Text style={styles.email}>{item.email}</Text>}
      </View>

      <View style={styles.leadFooter}>
        <Text style={styles.source}>{item.source.replace('_', ' ')}</Text>
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => handleCall(item.phone)}
        >
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        renderItem={renderLead}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadLeads} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No leads assigned to you</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  list: {
    padding: 16,
  },
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  leadInfo: {
    marginBottom: 12,
  },
  phone: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
  },
  leadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  source: {
    fontSize: 12,
    color: '#9ca3af',
  },
  callButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  callButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});
