import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  BackHandler,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallRecording } from '../hooks/useCallRecording';
import CallTimer from '../components/CallTimer';
import CallButton from '../components/CallButton';
import RecordingIndicator from '../components/RecordingIndicator';
import { formatPhoneNumber } from '../utils/formatters';
import { RootStackParamList, Lead } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Call'>;
type CallRouteProp = RouteProp<RootStackParamList, 'Call'>;

const CallScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CallRouteProp>();
  const { lead } = route.params;

  const {
    currentCall,
    isRecording,
    callDuration,
    recordingPath,
    endCall,
  } = useCallRecording();

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleEndCall();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const handleEndCall = async () => {
    Alert.alert(
      'End Call',
      'Are you ready to end the call and record the outcome?',
      [
        { text: 'Continue Call', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            await endCall();
            if (currentCall) {
              navigation.replace('Outcome', {
                call: currentCall,
                recordingPath: recordingPath || undefined,
              });
            } else {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Call Info */}
      <View style={styles.callInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {lead.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.name}>{lead.name}</Text>
        <Text style={styles.phone}>{formatPhoneNumber(lead.phone)}</Text>

        {lead.company && (
          <Text style={styles.company}>{lead.company}</Text>
        )}
      </View>

      {/* Timer and Recording */}
      <View style={styles.timerContainer}>
        <CallTimer seconds={callDuration} size="large" />
        <RecordingIndicator isRecording={isRecording} style={styles.recordingIndicator} />
      </View>

      {/* Status Message */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {isRecording ? 'Call in progress - Recording' : 'Call in progress'}
        </Text>
        <Text style={styles.statusSubtext}>
          Return here when call ends
        </Text>
      </View>

      {/* End Call Button */}
      <View style={styles.buttonContainer}>
        <CallButton
          variant="end"
          size="large"
          onPress={handleEndCall}
        />
        <Text style={styles.endCallText}>End Call</Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          The call is handled by your phone's dialer.{'\n'}
          Tap "End Call" when finished to record the outcome.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 60,
  },
  callInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  company: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  recordingIndicator: {
    marginTop: 16,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  statusText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  endCallText: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  instructions: {
    position: 'absolute',
    bottom: 40,
    left: 32,
    right: 32,
  },
  instructionsText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CallScreen;
