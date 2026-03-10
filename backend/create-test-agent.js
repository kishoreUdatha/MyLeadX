// Create a test voice agent
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestAgent() {
  try {
    // First check if VoiceAgent table exists
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'VoiceAgent'
    `;

    if (tables.length === 0) {
      console.log('❌ VoiceAgent table does not exist. Running migration...');
      return;
    }

    // Check existing agents
    const existingAgents = await prisma.voiceAgent.findMany();
    console.log(`Found ${existingAgents.length} existing agents`);

    if (existingAgents.length > 0) {
      console.log('Existing agents:');
      existingAgents.forEach(a => {
        console.log(`  - ${a.name} (${a.id}) - Active: ${a.isActive}`);
      });
      return;
    }

    // Get an organization to link to
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.log('❌ No organization found. Create one first.');
      return;
    }

    // Create test agent
    const agent = await prisma.voiceAgent.create({
      data: {
        organizationId: org.id,
        name: 'Test Sales Agent',
        industry: 'General',
        greeting: 'Hello! Thank you for calling. How can I help you today?',
        systemPrompt: 'You are a friendly sales assistant. Be helpful, concise, and professional. Keep responses to 1-2 sentences.',
        voiceId: 'alloy',
        isActive: true,
        questions: [
          { question: 'What is your name?', field: 'name' },
          { question: 'What is your email?', field: 'email' },
          { question: 'What are you interested in?', field: 'interest' }
        ],
        faqs: [
          { question: 'What are your business hours?', answer: 'We are open Monday to Friday, 9 AM to 6 PM.' },
          { question: 'How can I contact support?', answer: 'You can email us at support@example.com or call this number.' }
        ],
        fallbackMessage: "I'm sorry, I didn't catch that. Could you please repeat?",
        endMessage: 'Thank you for calling. Have a great day!'
      }
    });

    console.log('✅ Created test agent:', agent.name);
    console.log('   ID:', agent.id);
    console.log('   Greeting:', agent.greeting);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAgent();
