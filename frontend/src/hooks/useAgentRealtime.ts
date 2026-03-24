/**
 * Custom Hook for Agent Real-Time Sync
 *
 * Provides WebSocket-based real-time synchronization for agent configuration
 * across multiple browser tabs/users. Includes automatic token refresh handling.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { socketService } from '../services/socket.service';
import { tokenService } from '../services/token.service';
import { toast } from 'react-hot-toast';

interface AgentUpdateEvent {
  agentId: string;
  field: string;
  value: any;
  updatedBy: string;
  timestamp: string;
}

interface AgentRealtimeOptions {
  agentId: string;
  onFieldUpdate?: (field: string, value: any, updatedBy: string) => void;
  onFullReload?: (agent: any) => void;
  onStatusChange?: (type: string, message: string, data?: any) => void;
  userName?: string;
}

export function useAgentRealtime(options: AgentRealtimeOptions) {
  const { agentId, onFieldUpdate, onFullReload, onStatusChange, userName = 'User' } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<AgentUpdateEvent | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Track pending updates to avoid echo
  const pendingUpdates = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  // Setup socket event listeners
  const setupListeners = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Handle agent updates from other users
    socketService.onAgentUpdated((data) => {
      if (!mountedRef.current || data.agentId !== agentId) return;

      // Skip if this is our own update (echo prevention)
      const updateKey = `${data.field}:${data.timestamp}`;
      if (pendingUpdates.current.has(updateKey)) {
        pendingUpdates.current.delete(updateKey);
        return;
      }

      setLastUpdate(data);

      // Show notification about who made the change
      if (data.updatedBy && data.updatedBy !== userName) {
        toast(`${data.updatedBy} updated ${formatFieldName(data.field)}`, {
          icon: '🔄',
          duration: 2000,
        });
      }

      // Call the update callback
      if (onFieldUpdate) {
        onFieldUpdate(data.field, data.value, data.updatedBy);
      }
    });

    // Handle full agent reload
    socketService.onAgentReload((data) => {
      if (!mountedRef.current || data.agentId !== agentId) return;

      toast('Agent configuration reloaded', {
        icon: '🔄',
        duration: 2000,
      });

      if (onFullReload) {
        onFullReload(data.agent);
      }
    });

    // Handle viewer count updates
    socketService.onAgentViewers((data) => {
      if (mountedRef.current && data.agentId === agentId) {
        setViewerCount(data.viewerCount);
      }
    });

    // Handle status updates (e.g., RAG indexing)
    socketService.onAgentStatus((data) => {
      if (!mountedRef.current || data.agentId !== agentId) return;

      if (onStatusChange) {
        onStatusChange(data.type, data.message, data.data);
      }

      // Show appropriate toast based on type
      switch (data.type) {
        case 'rag_indexing':
          toast.loading(data.message, { id: 'rag-status' });
          break;
        case 'rag_complete':
          toast.success(data.message, { id: 'rag-status' });
          break;
        case 'error':
          toast.error(data.message, { id: 'rag-status' });
          break;
        default:
          toast(data.message, { duration: 3000 });
      }
    });
  }, [agentId, userName, onFieldUpdate, onFullReload, onStatusChange]);

  // Connect and subscribe to agent
  useEffect(() => {
    mountedRef.current = true;

    const initConnection = async () => {
      // Check if we have a valid token
      if (!tokenService.canRefresh() && !tokenService.isTokenValid()) {
        console.warn('[AgentRealtime] No valid token and cannot refresh');
        setConnectionError('Authentication required');
        return;
      }

      if (!agentId) {
        console.warn('[AgentRealtime] No agentId provided');
        return;
      }

      console.log('[AgentRealtime] Initializing connection for agent:', agentId);

      try {
        // Connect with automatic token refresh
        const socket = await socketService.connectAsync();

        if (!socket) {
          console.error('[AgentRealtime] Failed to establish socket connection');
          setConnectionError('Connection failed');
          return;
        }

        setConnectionError(null);

        const handleConnect = () => {
          if (!mountedRef.current) return;
          console.log('[AgentRealtime] Socket connected! Subscribing to agent:', agentId);
          setIsConnected(true);
          setConnectionError(null);
          socketService.subscribeToAgent(agentId);
        };

        const handleDisconnect = (reason: string) => {
          if (!mountedRef.current) return;
          console.log('[AgentRealtime] Socket disconnected. Reason:', reason);
          setIsConnected(false);
        };

        const handleConnectError = (error: Error) => {
          if (!mountedRef.current) return;
          console.error('[AgentRealtime] Connection error:', error.message);
          setIsConnected(false);
          setConnectionError(error.message);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        // Setup agent-specific listeners
        setupListeners();

        // If already connected, subscribe immediately
        if (socket.connected) {
          console.log('[AgentRealtime] Already connected, subscribing immediately');
          setIsConnected(true);
          socketService.subscribeToAgent(agentId);
        }

        // Handle token refresh - resubscribe after reconnection
        const handleTokenRefresh = () => {
          if (mountedRef.current && agentId) {
            console.log('[AgentRealtime] Token refreshed, resubscribing to agent');
            socketService.subscribeToAgent(agentId);
            setupListeners();
          }
        };

        socketService.onTokenRefresh(handleTokenRefresh);

        // Cleanup function
        return () => {
          socket.off('connect', handleConnect);
          socket.off('disconnect', handleDisconnect);
          socket.off('connect_error', handleConnectError);
          socketService.offTokenRefresh(handleTokenRefresh);
        };
      } catch (error) {
        console.error('[AgentRealtime] Error initializing connection:', error);
        setConnectionError('Connection failed');
      }
    };

    initConnection();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      console.log('[AgentRealtime] Cleaning up socket listeners for agent:', agentId);
      socketService.offAgentUpdated();
      socketService.offAgentReload();
      socketService.offAgentViewers();
      socketService.offAgentStatus();
      if (agentId) {
        socketService.unsubscribeFromAgent(agentId);
      }
    };
  }, [agentId, setupListeners]);

  // Broadcast field update to other subscribers
  const broadcastUpdate = useCallback(
    (field: string, value: any) => {
      if (!agentId || !isConnected) return;

      // Add to pending updates to prevent echo
      const updateKey = `${field}:${new Date().toISOString()}`;
      pendingUpdates.current.add(updateKey);

      // Clean up old pending updates after 5 seconds
      setTimeout(() => {
        pendingUpdates.current.delete(updateKey);
      }, 5000);

      socketService.emitAgentUpdate(agentId, field, value, userName);
    },
    [agentId, isConnected, userName]
  );

  // Manual reconnect function
  const reconnect = useCallback(async () => {
    console.log('[AgentRealtime] Manual reconnect requested');
    setConnectionError(null);
    const socket = await socketService.reconnect();
    if (socket && agentId) {
      socketService.subscribeToAgent(agentId);
      setupListeners();
    }
  }, [agentId, setupListeners]);

  return {
    isConnected,
    viewerCount,
    lastUpdate,
    connectionError,
    broadcastUpdate,
    reconnect,
  };
}

// Helper to format field names for display
function formatFieldName(field: string): string {
  const fieldNames: Record<string, string> = {
    systemPrompt: 'system prompt',
    greeting: 'greeting',
    voiceId: 'voice',
    language: 'language',
    temperature: 'temperature',
    topP: 'top P',
    maxTokens: 'max tokens',
    workflowSteps: 'workflow',
    branches: 'branches',
    testCases: 'test cases',
    ragSettings: 'RAG settings',
    connectedTools: 'tools',
    authenticationRequired: 'authentication',
    rateLimitingEnabled: 'rate limiting',
    contentFilteringEnabled: 'content filtering',
  };

  return fieldNames[field] || field.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
}
