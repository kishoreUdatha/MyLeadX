import React, { useEffect, useRef } from 'react';
import { StatusBar, LogBox, ActivityIndicator, View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { store, persistor } from './store';
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import AccessibilitySetupModal from './components/AccessibilitySetupModal';

// Services
import { offlineQueue, recordingBackupService, notificationService } from './services';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
  'This method is deprecated',
  'React Native Firebase namespaced API',
  'migrating-to-v22',
  '[NotificationService]',
  '[useCallRecording]',
  'No recording',
  'Recording service',
]);

// Loading component for PersistGate
const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3B82F6" />
  </View>
);

const App: React.FC = () => {
  const appState = useRef(AppState.currentState);
  const servicesInitialized = useRef(false);

  useEffect(() => {
    // Initialize services on app start. Each branch runs independently so the
    // UI can mount immediately — only offlineQueue.init() is awaited because
    // other code expects the singleton to be ready before queueing.
    const initializeServices = async () => {
      if (servicesInitialized.current) return;
      servicesInitialized.current = true;

      console.log('[App] Initializing services...');

      // Offline queue: small, fast, and other code relies on it being ready.
      offlineQueue.init().catch(err =>
        console.error('[App] Offline queue init failed:', err)
      );

      // Permissions: prompt the user but don't block the UI behind it.
      (async () => {
        try {
          const { requestCallPermissions } = require('./utils/permissions');
          const granted = await requestCallPermissions();
          console.log('[App] Permissions granted:', granted);
        } catch (err) {
          console.error('[App] Permission request failed:', err);
        }
      })();

      // Housekeeping: stale-recording cleanup. Pure background work.
      recordingBackupService.cleanup()
        .then(result => console.log('[App] Recording backup cleanup:', result))
        .catch(err => console.error('[App] Recording cleanup failed:', err));

      // Push notifications: Firebase getToken + backend registration. Slow,
      // and the first screen doesn't depend on it.
      notificationService.init()
        .then(ok => console.log('[App] Notifications initialized:', ok))
        .catch(err => console.error('[App] Notification init failed:', err));

      // Schedule hourly native cleanup. Independent of the rest.
      (async () => {
        try {
          const { NativeModules } = require('react-native');
          const { CallRecording } = NativeModules;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const apiUrl = (await AsyncStorage.getItem('apiUrl')) || '';
          const authToken = (await AsyncStorage.getItem('authToken')) || '';
          if (CallRecording && CallRecording.scheduleHourlyCleanup) {
            const result = await CallRecording.scheduleHourlyCleanup(apiUrl, authToken);
            console.log('[App] Hourly cleanup scheduled:', result);
          }
        } catch (cleanupError) {
          console.log('[App] Could not schedule hourly cleanup:', cleanupError);
        }
      })();
    };

    initializeServices();

    // Handle app state changes for background sync
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        console.log('[App] App came to foreground, processing offline queue...');
        offlineQueue.processQueue();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <Provider store={store}>
          <PersistGate loading={<LoadingScreen />} persistor={persistor}>
            <SafeAreaProvider>
              <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
              <AppNavigator />
              {/* <AccessibilitySetupModal /> */}
            </SafeAreaProvider>
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});

export default App;
