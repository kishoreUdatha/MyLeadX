import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, LeadFormData } from '../types';
import { useAppSelector, useAppDispatch } from '../store';
import { fetchLeadById, updateLead } from '../store/slices/leadsSlice';
import stagesApi, { LeadStage } from '../api/stages';

type Props = NativeStackScreenProps<RootStackParamList, 'EditLead'>;

const SOURCE_OPTIONS = [
  'Website',
  'Referral',
  'Cold Call',
  'Social Media',
  'Advertisement',
  'Trade Show',
  'Email Campaign',
  'Other',
];

const EditLeadScreen: React.FC<Props> = ({ route, navigation }) => {
  const { leadId } = route.params;
  const dispatch = useAppDispatch();
  const { selectedLead, isLoading } = useAppSelector((state) => state.leads);

  // Stages from API
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [loadingStages, setLoadingStages] = useState(true);
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    phone: '',
    email: '',
    company: '',
    source: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  // Load stages from API
  useEffect(() => {
    const loadStages = async () => {
      try {
        setLoadingStages(true);
        const { progressStages, lostStage } = await stagesApi.getJourneyStages();
        // Combine progress stages and lost stage
        const allStages = [...progressStages];
        if (lostStage) {
          allStages.push(lostStage);
        }
        setStages(allStages);
      } catch (error) {
        console.error('Error loading stages:', error);
      } finally {
        setLoadingStages(false);
      }
    };
    loadStages();
  }, []);

  useEffect(() => {
    dispatch(fetchLeadById(leadId));
  }, [dispatch, leadId]);

  useEffect(() => {
    if (selectedLead) {
      setFormData({
        name: selectedLead.name,
        phone: selectedLead.phone,
        email: selectedLead.email || '',
        company: selectedLead.company || '',
        source: selectedLead.source || '',
        notes: selectedLead.notes || '',
      });
      // Set selected stage from lead data
      if ((selectedLead as any).stageId) {
        setSelectedStageId((selectedLead as any).stageId);
      } else if ((selectedLead as any).stage?.id) {
        setSelectedStageId((selectedLead as any).stage.id);
      }
    }
  }, [selectedLead]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Only update notes and source - not basic details
      await dispatch(updateLead({
        leadId,
        data: {
          source: formData.source,
          notes: formData.notes,
        }
      })).unwrap();

      // Update stage if changed
      if (selectedStageId && selectedStageId !== (selectedLead as any)?.stageId) {
        try {
          await stagesApi.updateLeadStage(leadId, selectedStageId);
        } catch (stageError) {
          console.error('Error updating stage:', stageError);
        }
      }

      Alert.alert('Success', 'Lead updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update lead. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof LeadFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getSelectedStage = () => {
    return stages.find(s => s.id === selectedStageId);
  };

  const getCurrentStageName = () => {
    const stage = getSelectedStage();
    if (stage) return stage.name;
    // Fallback to lead's stage name if available
    if ((selectedLead as any)?.stage?.name) {
      return (selectedLead as any).stage.name;
    }
    return 'Select Stage';
  };

  const getStageColor = (stage: LeadStage) => {
    return stage.color || '#6B7280';
  };

  if (isLoading && !selectedLead) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Read-only notice */}
        <View style={styles.noticeCard}>
          <Icon name="information" size={20} color="#3B82F6" />
          <Text style={styles.noticeText}>
            Basic details can only be edited by managers. You can update the stage, source, and notes.
          </Text>
        </View>

        {/* Name Field - Read Only */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Name</Text>
          <View style={[styles.inputContainer, styles.readOnlyInput]}>
            <Icon name="account" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.readOnlyText]}
              value={formData.name}
              editable={false}
              placeholder="Name"
              placeholderTextColor="#9CA3AF"
            />
            <Icon name="lock" size={16} color="#9CA3AF" />
          </View>
        </View>

        {/* Phone Field - Read Only */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Phone</Text>
          <View style={[styles.inputContainer, styles.readOnlyInput]}>
            <Icon name="phone" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.readOnlyText]}
              value={formData.phone}
              editable={false}
              placeholder="Phone"
              placeholderTextColor="#9CA3AF"
            />
            <Icon name="lock" size={16} color="#9CA3AF" />
          </View>
        </View>

        {/* Email Field - Read Only */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputContainer, styles.readOnlyInput]}>
            <Icon name="email" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.readOnlyText]}
              value={formData.email || 'Not provided'}
              editable={false}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
            />
            <Icon name="lock" size={16} color="#9CA3AF" />
          </View>
        </View>

        {/* Company Field - Read Only */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Company</Text>
          <View style={[styles.inputContainer, styles.readOnlyInput]}>
            <Icon name="domain" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.readOnlyText]}
              value={formData.company || 'Not provided'}
              editable={false}
              placeholder="Company"
              placeholderTextColor="#9CA3AF"
            />
            <Icon name="lock" size={16} color="#9CA3AF" />
          </View>
        </View>

        {/* Stage Picker - Editable */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Lead Stage</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowStagePicker(!showStagePicker)}
            disabled={loadingStages}
          >
            {loadingStages ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <>
                <View style={[styles.stageDot, { backgroundColor: getSelectedStage()?.color || '#6B7280' }]} />
                <Text style={styles.pickerText}>{getCurrentStageName()}</Text>
                <Icon
                  name={showStagePicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#6B7280"
                />
              </>
            )}
          </TouchableOpacity>
          {showStagePicker && (
            <View style={styles.optionsList}>
              {stages.map((stage) => {
                const isSelected = selectedStageId === stage.id;
                const isLost = (stage.journeyOrder || 0) < 0;
                return (
                  <TouchableOpacity
                    key={stage.id}
                    style={[
                      styles.optionItem,
                      isSelected && styles.optionItemActive,
                      isLost && styles.lostStageOption,
                    ]}
                    onPress={() => {
                      setSelectedStageId(stage.id);
                      setShowStagePicker(false);
                    }}
                  >
                    <View style={[styles.stageDot, { backgroundColor: stage.color || '#6B7280' }]} />
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextActive,
                        isLost && styles.lostStageText,
                      ]}
                    >
                      {stage.name}
                    </Text>
                    {isSelected && <Icon name="check" size={18} color="#3B82F6" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Source Picker - Editable */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Source</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowSourcePicker(!showSourcePicker)}
          >
            <Icon name="earth" size={20} color="#6B7280" style={styles.inputIcon} />
            <Text style={[styles.pickerText, !formData.source && styles.placeholderText]}>
              {formData.source || 'Select source'}
            </Text>
            <Icon
              name={showSourcePicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
          {showSourcePicker && (
            <View style={styles.optionsList}>
              {SOURCE_OPTIONS.map((source) => (
                <TouchableOpacity
                  key={source}
                  style={[
                    styles.optionItem,
                    formData.source === source && styles.optionItemActive,
                  ]}
                  onPress={() => {
                    updateField('source', source);
                    setShowSourcePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.source === source && styles.optionTextActive,
                    ]}
                  >
                    {source}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Notes Field - Editable */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Notes</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(value) => updateField('notes', value)}
              placeholder="Add notes about this lead..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="content-save" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  readOnlyInput: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  readOnlyText: {
    color: '#6B7280',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 14,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 0,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  optionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
    overflow: 'hidden',
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionItemActive: {
    backgroundColor: '#EBF5FF',
  },
  lostStageOption: {
    backgroundColor: '#FEF2F2',
    borderTopWidth: 2,
    borderTopColor: '#FECACA',
  },
  lostStageText: {
    color: '#DC2626',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  optionTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});

export default EditLeadScreen;
