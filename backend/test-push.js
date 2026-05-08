const admin = require('firebase-admin');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function test() {
  // Get user by email
  const user = await prisma.user.findFirst({
    where: { email: 'info@ghanasyamedu.com' }
  });
  
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  
  console.log('User found:', user.id, user.firstName);
  
  // Get device tokens
  const devices = await prisma.deviceToken.findMany({
    where: { userId: user.id, isActive: true }
  });
  
  console.log('Device tokens:', devices.length);
  
  if (devices.length === 0) {
    console.log('No device tokens for this user. App needs to register FCM token.');
    
    // Check all tokens
    const allTokens = await prisma.deviceToken.findMany({ take: 5 });
    console.log('Total tokens in DB:', allTokens.length);
    
    process.exit(1);
  }
  
  const tokens = devices.map(d => d.token);
  
  const message = {
    tokens,
    notification: {
      title: 'Test from MyLeadX',
      body: 'Push notifications are working!',
    },
    android: { priority: 'high' },
  };
  
  const response = await admin.messaging().sendEachForMulticast(message);
  console.log('Sent! Success:', response.successCount, 'Failed:', response.failureCount);
  
  process.exit(0);
}

test().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
