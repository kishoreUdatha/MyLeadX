/**
 * Plivo Integration Test Script
 * Run with: npx ts-node src/scripts/test-plivo.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { plivoService } from '../integrations/plivo.service';

const TEST_PHONE = process.env.TEST_PHONE_NUMBER || '';

async function testPlivoIntegration() {
  console.log('\n🔧 PLIVO INTEGRATION TEST\n');
  console.log('='.repeat(50));

  // Test 1: Check Configuration
  console.log('\n📋 Test 1: Checking Plivo Configuration...');
  try {
    const isConfigured = plivoService.isConfigured();
    if (isConfigured) {
      console.log('✅ Plivo is configured');

      // Get account balance
      const balance = await plivoService.getAccountBalance();
      console.log(`💰 Account Balance: ${balance.currency} ${balance.balance}`);
    } else {
      console.log('❌ Plivo is NOT configured');
      console.log('\n⚠️  Please update your .env file with:');
      console.log('   PLIVO_AUTH_ID=your-auth-id');
      console.log('   PLIVO_AUTH_TOKEN=your-auth-token');
      console.log('   PLIVO_PHONE_NUMBER=+91XXXXXXXXXX');
      return;
    }
  } catch (error: any) {
    console.log('❌ Configuration Error:', error.message);
    return;
  }

  // Test 2: List Phone Numbers
  console.log('\n📞 Test 2: Listing Phone Numbers...');
  try {
    const numbers = await plivoService.listPhoneNumbers();
    if (numbers && numbers.length > 0) {
      console.log('✅ Phone numbers found:');
      numbers.forEach((num: any) => {
        console.log(`   ${num.number} (${num.region || 'N/A'})`);
      });
    } else {
      console.log('⚠️  No phone numbers found. You need to buy a number from Plivo.');
    }
  } catch (error: any) {
    console.log('❌ Error listing numbers:', error.message);
  }

  // Test 3: Send Test SMS (optional)
  if (TEST_PHONE) {
    console.log(`\n📱 Test 3: Sending Test SMS to ${TEST_PHONE}...`);
    try {
      const smsResult = await plivoService.sendSms({
        to: TEST_PHONE,
        message: 'Hello from CRM! This is a test message from Plivo integration. 🎉',
        userId: 'test-script',
      });
      console.log('✅ SMS sent successfully!');
      console.log(`   Message ID: ${smsResult.messageId}`);
    } catch (error: any) {
      console.log('❌ SMS Error:', error.message);
      if (error.message.includes('not configured')) {
        console.log('   → Please configure PLIVO_PHONE_NUMBER in .env');
      }
    }
  } else {
    console.log('\n📱 Test 3: Skipping SMS test (no TEST_PHONE_NUMBER set)');
  }

  // Test 4: Test Call (optional - commented out to avoid accidental calls)
  console.log('\n📞 Test 4: Call Test');
  console.log('   ⚠️  Call test is disabled by default to avoid charges');
  console.log('   To test calling, uncomment the call test section in the script');

  /*
  if (TEST_PHONE) {
    console.log(`\n📞 Test 4: Making Test Call to ${TEST_PHONE}...`);
    try {
      const callResult = await plivoService.makeCall({
        to: TEST_PHONE,
        callerId: 'test-script',
      }, 'http://your-webhook-url/api/plivo/webhook/answer');
      console.log('✅ Call initiated!');
      console.log(`   Call ID: ${callResult.callId}`);
    } catch (error: any) {
      console.log('❌ Call Error:', error.message);
    }
  }
  */

  console.log('\n' + '='.repeat(50));
  console.log('✅ Plivo Integration Test Complete!\n');
}

// Run the test
testPlivoIntegration().catch(console.error);
