// Check Exotel account details
require('dotenv').config();
const axios = require('axios');

const config = {
  accountSid: process.env.EXOTEL_ACCOUNT_SID,
  apiKey: process.env.EXOTEL_API_KEY,
  apiToken: process.env.EXOTEL_API_TOKEN,
  subdomain: process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
  callerId: process.env.EXOTEL_CALLER_ID,
  appId: process.env.EXOTEL_APP_ID,
};

console.log('=== Exotel Configuration ===');
console.log('Account SID:', config.accountSid);
console.log('API Key:', config.apiKey?.substring(0, 10) + '...');
console.log('Subdomain:', config.subdomain);
console.log('Caller ID:', config.callerId);
console.log('App ID:', config.appId);
console.log('');

async function checkAccount() {
  const baseUrl = `https://${config.subdomain}/v1/Accounts/${config.accountSid}`;

  try {
    // Get account details
    console.log('=== Account Details ===');
    const response = await axios.get(
      `${baseUrl}.json`,
      {
        auth: {
          username: config.apiKey,
          password: config.apiToken,
        },
      }
    );

    const account = response.data.Account;
    console.log('Status:', account.Status);
    console.log('Balance:', account.Balance);
    console.log('Type:', account.Type);
    console.log('');

    // List ExoPhones
    console.log('=== ExoPhones ===');
    const phonesResponse = await axios.get(
      `${baseUrl}/IncomingPhoneNumbers.json`,
      {
        auth: {
          username: config.apiKey,
          password: config.apiToken,
        },
      }
    );

    if (phonesResponse.data.IncomingPhoneNumbers) {
      const phones = phonesResponse.data.IncomingPhoneNumbers.IncomingPhoneNumber || [];
      const phoneList = Array.isArray(phones) ? phones : [phones];

      phoneList.forEach(phone => {
        console.log(`- ${phone.PhoneNumber} (${phone.FriendlyName || 'No name'})`);
        console.log(`  SID: ${phone.Sid}`);
        console.log(`  Capabilities: Voice=${phone.VoiceUrl ? 'Yes' : 'No'}, SMS=${phone.SmsUrl ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('No ExoPhones found');
    }

  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
  }
}

checkAccount();
