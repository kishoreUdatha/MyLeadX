// Simple WebSocket test for Exotel Voice Bot
const WebSocket = require('ws');

const wsUrl = 'wss://paleethnological-avuncular-zoey.ngrok-free.dev/voice-stream?callId=test_' + Date.now() + '&agentId=a3093e1e-e11d-4656-8ebc-029029262b57';

console.log('Connecting to:', wsUrl);

const ws = new WebSocket(wsUrl, {
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
});

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');

  // Simulate Exotel's "start" event
  const startMessage = {
    event: 'start',
    start: {
      streamSid: 'test_stream_' + Date.now(),
      callSid: 'test_call_123',
      accountSid: 'test_account'
    }
  };

  console.log('📤 Sending start event...');
  ws.send(JSON.stringify(startMessage));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received:', message.event || 'unknown event');

    if (message.event === 'media' && message.media?.payload) {
      const audioSize = Buffer.from(message.media.payload, 'base64').length;
      console.log(`   Audio chunk: ${audioSize} bytes`);
    }
  } catch (e) {
    console.log('📥 Raw message:', data.toString().substring(0, 100));
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} - ${reason || 'No reason'}`);
  process.exit(0);
});

// Close after 15 seconds to allow TTS response
setTimeout(() => {
  console.log('\n⏱️ Test complete, closing connection...');
  ws.close();
}, 15000);
