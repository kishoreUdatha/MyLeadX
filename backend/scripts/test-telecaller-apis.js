const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testAPIs() {
  console.log('=== Testing Telecaller App Backend APIs ===\n');

  let token = null;
  let leadId = null;
  let callId = null;

  const results = [];

  // Helper function to test an endpoint
  async function testEndpoint(name, method, url, data = null, requiresAuth = true) {
    try {
      const config = {
        method,
        url: `${API_URL}${url}`,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (requiresAuth && token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      console.log(`✓ ${name}: ${response.status} OK`);
      results.push({ name, status: 'PASS', statusCode: response.status });
      return response.data;
    } catch (error) {
      const status = error.response?.status || 'Network Error';
      const message = error.response?.data?.message || error.message;
      console.log(`✗ ${name}: ${status} - ${message}`);
      results.push({ name, status: 'FAIL', statusCode: status, error: message });
      return null;
    }
  }

  // 1. Test Login
  console.log('--- Authentication ---');
  const loginResponse = await testEndpoint(
    'POST /auth/login',
    'POST',
    '/auth/login',
    { email: 'telecaller2@demo.com', password: 'Demo@123' },
    false
  );

  if (loginResponse?.data?.accessToken) {
    token = loginResponse.data.accessToken;
    console.log('  → Token obtained successfully\n');
  } else if (loginResponse?.success === false) {
    console.log('  → Login failed, trying with admin account...\n');
    const adminLogin = await testEndpoint(
      'POST /auth/login (admin)',
      'POST',
      '/auth/login',
      { email: 'admin@demo.com', password: 'admin123' },
      false
    );
    if (adminLogin?.data?.accessToken) {
      token = adminLogin.data.accessToken;
      console.log('  → Admin token obtained\n');
    }
  }

  if (!token) {
    console.log('\n❌ Cannot proceed without authentication token');
    return;
  }

  // 2. Test Telecaller Stats
  console.log('--- Telecaller Endpoints ---');
  await testEndpoint('GET /telecaller/stats', 'GET', '/telecaller/stats');

  // 3. Test Get Leads
  const leadsResponse = await testEndpoint('GET /telecaller/leads', 'GET', '/telecaller/leads?page=1&limit=10');
  if (leadsResponse?.data?.leads?.length > 0) {
    leadId = leadsResponse.data.leads[0].id;
    console.log(`  → Found ${leadsResponse.data.leads.length} leads, using leadId: ${leadId}\n`);
  }

  // 4. Test Get Calls
  const callsResponse = await testEndpoint('GET /telecaller/calls', 'GET', '/telecaller/calls?page=1&limit=10');
  if (callsResponse?.data?.calls?.length > 0) {
    callId = callsResponse.data.calls[0].id;
    console.log(`  → Found ${callsResponse.data.calls.length} calls\n`);
  }

  // 5. Test Create Call (if we have a lead)
  if (leadId) {
    console.log('--- Call Management ---');
    const createCallResponse = await testEndpoint(
      'POST /telecaller/calls',
      'POST',
      '/telecaller/calls',
      {
        leadId,
        phoneNumber: '+919999999999',
        direction: 'OUTBOUND'
      }
    );
    if (createCallResponse?.data?.id) {
      callId = createCallResponse.data.id;
      console.log(`  → Created call: ${callId}\n`);

      // 6. Test Update Call
      await testEndpoint(
        'PUT /telecaller/calls/:callId',
        'PUT',
        `/telecaller/calls/${callId}`,
        {
          status: 'COMPLETED',
          duration: 120,
          outcome: 'INTERESTED',
          notes: 'Test call from API verification'
        }
      );
    }
  }

  // 7. Test Lead Endpoints
  if (leadId) {
    console.log('\n--- Lead Endpoints ---');
    await testEndpoint('GET /leads/:id', 'GET', `/leads/${leadId}`);

    await testEndpoint(
      'PATCH /leads/:id',
      'PATCH',
      `/leads/${leadId}`,
      { priority: 'MEDIUM' }
    );

    await testEndpoint(
      'POST /leads/:id/notes',
      'POST',
      `/leads/${leadId}/notes`,
      { content: 'Test note from API verification' }
    );
  }

  // 8. Test appointments endpoint (correct path is /telecaller/appointments)
  console.log('\n--- Appointments ---');
  await testEndpoint('GET /telecaller/appointments/available-slots', 'GET', '/telecaller/appointments/available-slots?date=' + new Date().toISOString().split('T')[0]);

  // 9. Test messaging endpoints
  console.log('\n--- Messaging ---');
  await testEndpoint('GET /messaging/templates', 'GET', '/messaging/templates');

  // Print Summary
  console.log('\n=== Summary ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log('\nFailed endpoints:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.statusCode} - ${r.error}`);
    });
  }
}

testAPIs().catch(console.error);
