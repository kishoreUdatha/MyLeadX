// Create VoiceAgent table directly
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTable() {
  try {
    // Check if table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'VoiceAgent'
      );
    `;

    if (tableExists[0].exists) {
      console.log('✅ VoiceAgent table already exists');
      return;
    }

    console.log('Creating VoiceAgent table...');

    // Create enum if not exists
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "VoiceAgentIndustry" AS ENUM (
          'EDUCATION', 'IT_RECRUITMENT', 'REAL_ESTATE', 'CUSTOMER_CARE',
          'TECHNICAL_INTERVIEW', 'HEALTHCARE', 'FINANCE', 'ECOMMERCE', 'CUSTOM'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create VoiceAgent table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VoiceAgent" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "organizationId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "industry" "VoiceAgentIndustry" NOT NULL DEFAULT 'CUSTOM',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "systemPrompt" TEXT NOT NULL,
        "voiceId" TEXT NOT NULL DEFAULT 'alloy',
        "language" TEXT NOT NULL DEFAULT 'en',
        "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
        "questions" JSONB NOT NULL DEFAULT '[]',
        "knowledgeBase" TEXT,
        "faqs" JSONB NOT NULL DEFAULT '[]',
        "greeting" TEXT,
        "fallbackMessage" TEXT,
        "endMessage" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VoiceAgent_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create OutboundCall table if not exists
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "CallStatus" AS ENUM (
          'INITIATED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER', 'CANCELLED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OutboundCall" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "agentId" TEXT NOT NULL,
        "leadId" TEXT,
        "phoneNumber" TEXT NOT NULL,
        "status" "CallStatus" NOT NULL DEFAULT 'INITIATED',
        "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
        "duration" INTEGER,
        "transcript" TEXT,
        "qualification" TEXT,
        "summary" TEXT,
        "sentiment" TEXT,
        "externalCallId" TEXT,
        "startedAt" TIMESTAMP(3),
        "endedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "OutboundCall_pkey" PRIMARY KEY ("id")
      );
    `);

    console.log('✅ Tables created successfully');

    // Get an organization
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.log('⚠️ No organization found. Please create an organization first.');
      return;
    }

    // Create test agent using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "VoiceAgent" (
        "id", "organizationId", "name", "industry", "isActive",
        "systemPrompt", "voiceId", "language", "temperature",
        "questions", "faqs", "greeting", "fallbackMessage", "endMessage"
      ) VALUES (
        gen_random_uuid()::text,
        '${org.id}',
        'Test Sales Agent',
        'CUSTOM',
        true,
        'You are a friendly sales assistant. Be helpful, concise, and professional. Keep responses to 1-2 sentences.',
        'alloy',
        'en',
        0.7,
        '[{"question": "What is your name?", "field": "name"}, {"question": "What is your email?", "field": "email"}]',
        '[{"question": "What are your hours?", "answer": "We are open 9 AM to 6 PM, Monday to Friday."}]',
        'Hello! Thank you for calling. How can I help you today?',
        'I am sorry, I did not catch that. Could you please repeat?',
        'Thank you for calling. Have a great day!'
      );
    `);

    console.log('✅ Test agent created');

    // Verify
    const agents = await prisma.$queryRaw`SELECT id, name, greeting FROM "VoiceAgent"`;
    console.log('Voice agents:', agents);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

createTable();
