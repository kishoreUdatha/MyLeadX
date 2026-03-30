// Full Voice Bot Test - simulates Exotel protocol
const WebSocket = require('ws');

const wsUrl = 'wss://paleethnological-avuncular-zoey.ngrok-free.dev/voice-stream?callId=test_' + Date.now() + '&agentId=a3093e1e-e11d-4656-8ebc-029029262b57';

console.log('🔌 Connecting to:', wsUrl);
console.log('');

const ws = new WebSocket(wsUrl, {
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
});

let audioChunksReceived = 0;
let totalAudioBytes = 0;

ws.on('open', () => {
  console.log('✅ WebSocket connected!');
  console.log('');

  // Step 1: Send "connected" event (like Exotel does)
  const connectedMsg = { event: 'connected' };
  console.log('📤 Sending: connected event');
  ws.send(JSON.stringify(connectedMsg));

  // Step 2: Send "start" event after a short delay (like Exotel does)
  setTimeout(() => {
    const startMsg = {
      event: 'start',
      streamSid: 'stream_' + Date.now(),
      start: {
        streamSid: 'stream_' + Date.now(),
        callSid: 'call_test_123',
        accountSid: 'test_account',
        mediaFormat: {
          encoding: 'audio/x-l16',
          sampleRate: 8000,
          channels: 1
        }
      }
    };
    console.log('📤 Sending: start event');
    console.log('   Stream SID:', startMsg.streamSid);
    console.log('');
    console.log('⏳ Waiting for AI greeting response...');
    console.log('');
    ws.send(JSON.stringify(startMsg));
  }, 500);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());

    switch (message.event) {
      case 'media':
        audioChunksReceived++;
        if (message.media?.payload) {
          const audioSize = Buffer.from(message.media.payload, 'base64').length;
          totalAudioBytes += audioSize;

          // Only log occasionally to avoid spam
          if (audioChunksReceived === 1) {
            console.log('📥 Receiving audio chunks...');
          }
          if (audioChunksReceived % 10 === 0) {
            console.log(`   Chunks: ${audioChunksReceived}, Total: ${(totalAudioBytes / 1024).toFixed(1)} KB`);
          }
        }
        break;

      case 'mark':
        console.log('');
        console.log('✅ Audio playback complete!');
        console.log(`   Total chunks: ${audioChunksReceived}`);
        console.log(`   Total audio: ${(totalAudioBytes / 1024).toFixed(1)} KB`);
        console.log(`   Mark: ${message.mark?.name}`);
        break;

      default:
        console.log('📥 Event:', message.event, message);
    }
  } catch (e) {
    console.log('📥 Raw:', data.toString().substring(0, 100));
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log('');
  console.log('🔌 Connection closed');
  console.log(`   Code: ${code}`);
  console.log(`   Audio chunks received: ${audioChunksReceived}`);
  console.log(`   Total audio: ${(totalAudioBytes / 1024).toFixed(1)} KB`);
  process.exit(0);
});

// Keep connection open for 30 seconds to receive full greeting
setTimeout(() => {
  console.log('');
  console.log('⏱️ Test timeout reached, closing...');
  ws.close();
}, 30000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n Interrupted, closing...');
  ws.close();
});
