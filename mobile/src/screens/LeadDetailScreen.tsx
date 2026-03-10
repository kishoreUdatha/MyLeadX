import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import { AppDispatch, RootState } from '../store';
import { fetchLeadById, updateLeadStatus } from '../store/slices/leadSlice';
import { leadService } from '../services/lead.service';

const statusOptions = [
  { value: 'NEW', label: 'New', color: '#3b82f6' },
  { value: 'CONTACTED', label: 'Contacted', color: '#f59e0b' },
  { value: 'QUALIFIED', label: 'Qualified', color: '#10b981' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: '#8b5cf6' },
  { value: 'FOLLOW_UP', label: 'Follow Up', color: '#f97316' },
  { value: 'WON', label: 'Won', color: '#059669' },
  { value: 'LOST', label: 'Lost', color: '#ef4444' },
];

export default function LeadDetailScreen() {
  const route = useRoute();
  const dispatch = useDispatch<AppDispatch>();
  const { currentLead } = useSelector((state: RootState) => state.leads);
  const [notes, setNotes] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const { id } = route.params as { id: string };

  useEffect(() => {
    dispatch(fetchLeadById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (currentLead?.notes) {
      setNotes(currentLead.notes);
    }
  }, [currentLead]);

  const handleCall = () => {
    if (currentLead?.phone) {
      Linking.openURL(`tel:${currentLead.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (currentLead?.phone) {
      Linking.openURL(`whatsapp://send?phone=${currentLead.phone}`);
    }
  };

  const handleEmail = () => {
    if (currentLead?.email) {
      Linking.openURL(`mailto:${currentLead.email}`);
    }
  };

  const handleStatusChange = async (status: string) => {
    await dispatch(updateLeadStatus({ id, status }));
    setShowStatusPicker(false);
    Alert.alert('Success', 'Status updated');
  };

  const handleSaveNotes = async () => {
    try {
      await leadService.addNote(id, notes);
      Alert.alert('Success', 'Notes saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save notes');
    }
  };

  if (!currentLead) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>
          {currentLead.firstName} {currentLead.lastName}
        </Text>
        <TouchableOpacity
          style={[
            styles.statusBadge,
            { backgroundColor: statusOptions.find((s) => s.value === currentLead.status)?.color || '#9ca3af' },
          ]}
          onPress={() => setShowStatusPicker(!showStatusPicker)}
        >
          <Text style={styles.statusText}>{currentLead.status.replace('_', ' ')}</Text>
        </TouchableOpacity>
      </View>

      {/* Status Picker */}
      {showStatusPicker && (
        <View style={styles.statusPicker}>
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.statusOption, { borderLeftColor: option.color }]}
              onPress={() => handleStatusChange(option.value)}
            >
              <Text style={styles.statusOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Contact Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.callButton]} onPress={handleCall}>
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.whatsappButton]} onPress={handleWhatsApp}>
          <Text style={styles.actionText}>WhatsApp</Text>
        </TouchableOpacity>
        {currentLead.email && (
          <TouchableOpacity style={[styles.actionButton, styles.emailButton]} onPress={handleEmail}>
            <Text style={styles.actionText}>Email</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{currentLead.phone}</Text>
        </View>
        {currentLead.email && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{currentLead.email}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Source</Text>
          <Text style={styles.value}>{currentLead.source.replace('_', ' ')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Priority</Text>
          <Text style={styles.value}>{currentLead.priority}</Text>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes about this lead..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveNotes}>
          <Text style={styles.saveButtonText}>Save Notes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
  },
  statusPicker: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusOption: {
    padding: 12,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statusOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#10b981',
  },
  whatsappButton: {
    backgroundColor: '#25d366',
  },
  emailButton: {
    backgroundColor: '#3b82f6',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    color: '#6b7280',
  },
  value: {
    color: '#111827',
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
