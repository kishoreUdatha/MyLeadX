require('dotenv').config();
const OpenAI = require('openai').default;

console.log('OpenAI configured:', !!process.env.OPENAI_API_KEY);
console.log('Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');

async function testTTS() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ No OpenAI API key configured');
    return;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    console.log('\nTesting TTS...');
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: 'Hello, this is a test.',
      response_format: 'pcm',
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    console.log('✅ TTS works! Generated', buffer.length, 'bytes of audio');

  } catch (error) {
    console.log('❌ TTS Error:', error.message);
    if (error.status) console.log('   Status:', error.status);
  }
}

testTTS();
