/**
 * Flow Test Mode Hook
 * Handles test call simulation with voice capabilities
 */

import { useState, useRef, useCallback } from 'react';
import { Node, Edge } from 'reactflow';

interface UseFlowTestModeReturn {
  // State
  showTestMode: boolean;
  testStep: number;
  testPath: Node[];
  testInput: string;
  testVariables: Record<string, string>;
  voiceEnabled: boolean;
  isSpeaking: boolean;
  isListening: boolean;

  // Actions
  setShowTestMode: (show: boolean) => void;
  setTestInput: (input: string) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  startTestMode: () => void;
  nextTestStep: () => void;
  speakMessage: (text: string) => void;
  stopSpeaking: () => void;
  startListening: () => void;
  stopListening: () => void;
  getNodeMessage: (node: Node) => string;
  getNodeMessageClean: (node: Node) => string;
  resetTest: () => void;
}

export function useFlowTestMode(
  nodes: Node[],
  edges: Edge[],
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
): UseFlowTestModeReturn {
  const [showTestMode, setShowTestMode] = useState(false);
  const [testStep, setTestStep] = useState(0);
  const [testPath, setTestPath] = useState<Node[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Text-to-Speech function
  const speakMessage = useCallback((text: string) => {
    if (!voiceEnabled) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Remove emojis for cleaner speech
    const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v =>
      v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google UK English Female')
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Speech Recognition (Voice Input)
  const startListening = useCallback(() => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        showToast('Speech recognition not supported. Use Chrome browser.', 'error');
        return;
      }

      // Stop any ongoing speech first
      stopSpeaking();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Listening... Speak now!', 'info');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Show interim results or final
        setTestInput(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);

        switch (event.error) {
          case 'not-allowed':
            showToast('Microphone blocked! Click the lock icon in address bar to allow.', 'error');
            break;
          case 'no-speech':
            showToast('No speech detected. Try again.', 'error');
            break;
          case 'audio-capture':
            showToast('No microphone found. Check your device.', 'error');
            break;
          default:
            showToast(`Error: ${event.error}`, 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      showToast('Failed to start voice input. Use Chrome browser.', 'error');
    }
  }, [stopSpeaking, showToast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  // Get clean message for TTS (without emojis)
  const getNodeMessageClean = useCallback((node: Node): string => {
    switch (node.type) {
      case 'start':
        return 'Call connected';
      case 'greeting':
        return node.data.message || 'Hello! How can I help you today?';
      case 'question':
        return node.data.question || 'Could you please provide more information?';
      case 'ai_response':
        return node.data.aiPrompt || 'I understand. Let me help you with that.';
      case 'action':
        return `Performing action: ${node.data.actionType || 'processing'}`;
      case 'transfer':
        return `Transferring call to ${node.data.transferNumber || 'agent'}`;
      case 'end':
        return `Call ended. Outcome: ${node.data.outcomeType || 'Completed'}`;
      default:
        return node.data.label || 'Processing';
    }
  }, []);

  const getNodeMessage = useCallback((node: Node): string => {
    switch (node.type) {
      case 'start':
        return 'Call connected...';
      case 'greeting':
        return node.data.message || 'Hello! How can I help you today?';
      case 'question':
        return node.data.question || 'Could you please provide more information?';
      case 'ai_response':
        return `AI: ${node.data.aiPrompt || 'I understand. Let me help you with that.'}`;
      case 'action':
        return `Action: ${node.data.actionType || 'Performing action...'}`;
      case 'transfer':
        return `Transferring to ${node.data.transferNumber || 'agent'}...`;
      case 'end':
        return `Call ended: ${node.data.outcomeType || 'Completed'}`;
      default:
        return node.data.label || 'Processing...';
    }
  }, []);

  // Start test mode
  const startTestMode = useCallback(() => {
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) {
      showToast('Add a Start node first', 'error');
      return;
    }

    // Build the path from start node
    const path: Node[] = [startNode];
    let currentNodeId = startNode.id;
    const visited = new Set<string>();

    while (currentNodeId && !visited.has(currentNodeId)) {
      visited.add(currentNodeId);
      const outgoingEdge = edges.find(e => e.source === currentNodeId);
      if (outgoingEdge) {
        const nextNode = nodes.find(n => n.id === outgoingEdge.target);
        if (nextNode) {
          path.push(nextNode);
          currentNodeId = nextNode.id;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (path.length <= 1) {
      showToast('Connect nodes to the Start to test', 'error');
      return;
    }

    setTestPath(path);
    setTestStep(0);
    setTestVariables({});
    setTestInput('');
    setShowTestMode(true);

    // Speak the first message after a short delay
    setTimeout(() => {
      if (path[0]) {
        speakMessage(getNodeMessageClean(path[0]));
      }
    }, 500);
  }, [nodes, edges, showToast, speakMessage, getNodeMessageClean]);

  // Next test step
  const nextTestStep = useCallback(() => {
    const currentNode = testPath[testStep];

    // Save variable if it's a question node
    if (currentNode?.type === 'question' && currentNode.data.variableName && testInput) {
      setTestVariables(prev => ({
        ...prev,
        [currentNode.data.variableName!]: testInput
      }));
    }

    setTestInput('');

    if (testStep < testPath.length - 1) {
      const nextStep = testStep + 1;
      setTestStep(nextStep);

      // Speak the next message
      setTimeout(() => {
        if (testPath[nextStep]) {
          speakMessage(getNodeMessageClean(testPath[nextStep]));
        }
      }, 300);
    }
  }, [testPath, testStep, testInput, speakMessage, getNodeMessageClean]);

  // Reset test
  const resetTest = useCallback(() => {
    setTestStep(0);
    setTestVariables({});
    setTestInput('');
  }, []);

  return {
    showTestMode,
    testStep,
    testPath,
    testInput,
    testVariables,
    voiceEnabled,
    isSpeaking,
    isListening,
    setShowTestMode,
    setTestInput,
    setVoiceEnabled,
    startTestMode,
    nextTestStep,
    speakMessage,
    stopSpeaking,
    startListening,
    stopListening,
    getNodeMessage,
    getNodeMessageClean,
    resetTest,
  };
}

export default useFlowTestMode;
