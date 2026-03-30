import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCallRecording } from '../hooks/useCallRecording';
import OutcomeButton from '../components/OutcomeButton';
import { formatDuration } from '../utils/formatters';
import { RootStackParamList, CallOutcome } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Outcome'>;
type OutcomeRouteProp = RouteProp<RootStackParamList, 'Outcome'>;

interface OutcomeOption {
  outcome: CallOutcome;
  label: string;
  icon: string;
}

const OUTCOME_OPTIONS: OutcomeOption[] = [
  { outcome: 'INTERESTED', label: 'Interested', icon: 'thumb-up' },
  { outcome: 'NOT_INTERESTED', label: 'Not Interested', icon: 'thumb-down' },
  { outcome: 'CALLBACK', label: 'Callback', icon: 'phone-return' },
  { outcome: 'CONVERTED', label: 'Converted', icon: 'check-circle' },
  { outcome: 'NO_ANSWER', label: 'No Answer', icon: 'phone-missed' },
  { outcome: 'BUSY', label: 'Busy', icon: 'phone-lock' },
  { outcome: 'WRONG_NUMBER', label: 'Wrong Number', icon: 'phone-cancel' },
  { outcome: 'VOICEMAIL', label: 'Voicemail', icon: 'voicemail' },
];

const OutcomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OutcomeRouteProp>();
  const { call, recordingPath } = route.params;

  const { submitOutcome, callDuration } = useCallRecording();

  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOutcomeSelect = useCallback((outcome: CallOutcome) => {
    setSelectedOutcome(outcome);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedOutcome) {
      Alert.alert('Select Outcome', 'Please select a call outcome before saving.');
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await submitOutcome(selectedOutcome, notes.trim() || undefined);

      if (success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedOutcome, notes, submitOutcome, navigation]);

  const handleSkip = useCallback(() => {
    Alert.alert(
      'Skip Outcome',
      'Are you sure you want to skip without recording the outcome? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          },
        },
      ]
    );
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call Outcome</Text>
        <View style={styles.skipButton} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Call Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Icon name="timer-outline" size={20} color="#6B7280" />
            <Text style={styles.summaryLabel}>Call Duration</Text>
            <Text style={styles.summaryValue}>{formatDuration(callDuration)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Icon name="microphone" size={20} color="#6B7280" />
            <Text style={styles.summaryLabel}>Recording</Text>
            <Text style={[styles.summaryValue, { color: recordingPath ? '#10B981' : '#9CA3AF' }]}>
              {recordingPath ? 'Captured' : 'Not Available'}
            </Text>
          </View>
        </View>

        {/* Outcome Selection */}
        <Text style={styles.sectionTitle}>Select Outcome</Text>
        <View style={styles.outcomeGrid}>
          {OUTCOME_OPTIONS.map((option) => (
            <OutcomeButton
              key={option.outcome}
              outcome={option.outcome}
              label={option.label}
              icon={option.icon}
              selected={selectedOutcome === option.outcome}
              onPress={handleOutcomeSelect}
            />
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <View style={styles.notesContainer}>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes about the call..."
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            !selectedOutcome && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedOutcome || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="check" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Save & Continue</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  skipButton: {
    width: 60,
    alignItems: 'flex-start',
  },
  skipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  outcomeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 24,
  },
  notesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  notesInput: {
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 120,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default OutcomeScreen;
