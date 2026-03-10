// Check call status
require('dotenv').config();
const axios = require('axios');

const config = {
  accountSid: process.env.EXOTEL_ACCOUNT_SID,
  apiKey: process.env.EXOTEL_API_KEY,
  apiToken: process.env.EXOTEL_API_TOKEN,
  subdomain: process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
};

const callSid = process.argv[2] || '689f86a084e1505634706379259c1a2r';

async function checkStatus() {
  const baseUrl = `https://${config.subdomain}/v1/Accounts/${config.accountSid}`;

  try {
    const response = await axios.get(
      `${baseUrl}/Calls/${callSid}.json`,
      {
        auth: {
          username: config.apiKey,
          password: config.apiToken,
        },
      }
    );

    console.log('Call Status:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkStatus();
