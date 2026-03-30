// Make a test call using Exotel
require('dotenv').config();
const axios = require('axios');

const config = {
  accountSid: process.env.EXOTEL_ACCOUNT_SID,
  apiKey: process.env.EXOTEL_API_KEY,
  apiToken: process.env.EXOTEL_API_TOKEN,
  callerId: process.env.EXOTEL_CALLER_ID,
  appId: process.env.EXOTEL_APP_ID,
  subdomain: process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
};

console.log('Exotel Configuration:');
console.log('  Account SID:', config.accountSid);
console.log('  Caller ID:', config.callerId);
console.log('  App ID:', config.appId);
console.log('');

async function makeTestCall() {
  const toNumber = '+919908787055';

  const baseUrl = `https://${config.subdomain}/v1/Accounts/${config.accountSid}`;

  // Build form data
  const formData = new URLSearchParams();
  formData.append('From', toNumber);
  formData.append('CallerId', config.callerId);
  formData.append('Url', `http://my.exotel.com/exoml/start/${config.appId}`);
  formData.append('CallType', 'trans');
  formData.append('TimeLimit', '300'); // 5 minutes max
  formData.append('TimeOut', '30'); // 30 seconds ring timeout

  console.log('Making call to:', toNumber);
  console.log('Using App ID:', config.appId);
  console.log('Caller ID:', config.callerId);
  console.log('');

  try {
    const response = await axios.post(
      `${baseUrl}/Calls/connect.json`,
      formData,
      {
        auth: {
          username: config.apiKey,
          password: config.apiToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log('✅ Call initiated successfully!');
    console.log('');
    console.log('Call Details:');
    console.log('  Call SID:', response.data.Call?.Sid);
    console.log('  Status:', response.data.Call?.Status);
    console.log('  Direction:', response.data.Call?.Direction);
    console.log('');
    console.log('Full Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Call failed!');
    console.error('');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

makeTestCall();
