/**
 * Template Preview Modal
 * Modal for previewing voice templates with test call and voice preview features
 */

import { useTemplatePreview } from './hooks';
import {
  ModalHeader,
  TabBar,
  StartCallScreen,
  ActiveCallHeader,
  MessagesList,
  CallControls,
  VoicePreviewTab,
  ModalFooter,
} from './components';
import { TemplatePreviewModalProps } from './template-preview.types';

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  onClose,
}) => {
  const {
    activeTab,
    isPlaying,
    isLoadingAudio,
    messages,
    isRecording,
    isProcessing,
    customText,
    callActive,
    currentTranscript,
    callDuration,
    defaultGreeting,
    chatEndRef,
    setActiveTab,
    setCustomText,
    handlePlayVoice,
    handleStopVoice,
    startCall,
    endCall,
    stopBackendRecording,
    replayMessage,
    formatDuration,
  } = useTemplatePreview(template);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <ModalHeader template={template} onClose={onClose} />

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="h-[480px] overflow-hidden">
          {activeTab === 'conversation' ? (
            <div className="h-full flex flex-col">
              {!callActive ? (
                <StartCallScreen template={template} onStartCall={startCall} />
              ) : (
                <div className="flex-1 flex flex-col bg-gray-900">
                  <ActiveCallHeader
                    template={template}
                    callDuration={callDuration}
                    isPlaying={isPlaying}
                    isRecording={isRecording}
                    isProcessing={isProcessing}
                    formatDuration={formatDuration}
                  />

                  <MessagesList
                    messages={messages}
                    currentTranscript={currentTranscript}
                    isProcessing={isProcessing}
                    chatEndRef={chatEndRef}
                    onReplayMessage={replayMessage}
                  />

                  <CallControls
                    isRecording={isRecording}
                    isPlaying={isPlaying}
                    isProcessing={isProcessing}
                    onStopRecording={stopBackendRecording}
                    onEndCall={endCall}
                  />
                </div>
              )}
            </div>
          ) : (
            <VoicePreviewTab
              template={template}
              defaultGreeting={defaultGreeting}
              customText={customText}
              isLoadingAudio={isLoadingAudio}
              isPlaying={isPlaying}
              onCustomTextChange={setCustomText}
              onPlayVoice={handlePlayVoice}
              onStopVoice={handleStopVoice}
            />
          )}
        </div>

        <ModalFooter onClose={onClose} />
      </div>
    </div>
  );
};

export default TemplatePreviewModal;
