import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Storage key for persisted crash log. Kept small (last 5 entries) so it's
// cheap to read on the Settings screen and won't bloat AsyncStorage.
export const CRASH_LOG_STORAGE_KEY = '@telecaller/crash_log';
const MAX_CRASH_ENTRIES = 5;

export interface CrashLogEntry {
  message: string;
  stack: string;
  componentStack: string;
  timestamp: string;
}

/** Read the persisted crash log. Returns [] if nothing stored or on parse error. */
export const getCrashLog = async (): Promise<CrashLogEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(CRASH_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Clear the persisted crash log. */
export const clearCrashLog = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CRASH_LOG_STORAGE_KEY);
  } catch {
    // best-effort
  }
};

const persistCrash = async (error: Error, errorInfo: ErrorInfo): Promise<void> => {
  try {
    const existing = await getCrashLog();
    const entry: CrashLogEntry = {
      message: error.message || String(error),
      stack: (error.stack || '').slice(0, 4000), // cap to avoid bloating storage
      componentStack: (errorInfo.componentStack || '').slice(0, 4000),
      timestamp: new Date().toISOString(),
    };
    const next = [entry, ...existing].slice(0, MAX_CRASH_ENTRIES);
    await AsyncStorage.setItem(CRASH_LOG_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // If we can't even persist the crash, there's nothing more to do here.
  }
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Error info:', errorInfo);
    }
    // Persist to AsyncStorage so the next user / dev session can read the
    // crash even without Logcat access. Fire-and-forget; render fallback now.
    persistCrash(error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRestart = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              The app encountered an unexpected error
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo?.componentStack && (
                  <>
                    <Text style={styles.errorTitle}>Component Stack:</Text>
                    <Text style={styles.errorText}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  </>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleRestart}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorContainer: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#7F1D1D',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
