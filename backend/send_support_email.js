const { Resend } = require('resend');

const resend = new Resend('re_KfF7jMQz_HLCipLfF2smmSqPKstczTwj9');

async function sendSupportEmail() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'MyLeadX <noreply@myleadx.ai>',
      to: ['whatsapp-business-api@support.facebook.com'],
      subject: 'Request to Enable AUTHENTICATION Template Creation - WABA ID: 793425480137060',
      html: `
<h2>Request to Enable AUTHENTICATION Template Creation</h2>

<p>Dear WhatsApp Business API Support Team,</p>

<p>We are writing to request approval for creating <strong>AUTHENTICATION</strong> category message templates on our WhatsApp Business Account.</p>

<hr>

<h3>ACCOUNT DETAILS:</h3>
<table border="1" cellpadding="8" cellspacing="0">
  <tr><td><strong>Business Name</strong></td><td>SMARTGROW INFOTECH PRIVATE LIMITED</td></tr>
  <tr><td><strong>WhatsApp Business Account ID</strong></td><td>793425480137060</td></tr>
  <tr><td><strong>Phone Number ID</strong></td><td>1148409895011647</td></tr>
  <tr><td><strong>Display Phone Number</strong></td><td>+91 90639 35182</td></tr>
  <tr><td><strong>Verified Name</strong></td><td>MyLeadX</td></tr>
  <tr><td><strong>App ID</strong></td><td>1297901025601065</td></tr>
  <tr><td><strong>App Name</strong></td><td>MyLeadX</td></tr>
  <tr><td><strong>Business Verification</strong></td><td>✅ Verified (Apr 06, 2026)</td></tr>
</table>

<hr>

<h3>ISSUE DESCRIPTION:</h3>
<p>When attempting to create an AUTHENTICATION category template (either via Graph API or Meta Business Manager UI), we receive the following error:</p>
<pre style="background:#f4f4f4;padding:10px;border-radius:5px;">
"Cannot create message template"
"This WhatsApp Business account does not have permission to create message template"
</pre>

<hr>

<h3>WHAT WE HAVE VERIFIED:</h3>
<ul>
  <li>✅ Business is fully verified in Meta Business Manager</li>
  <li>✅ Two-Factor Authentication is enabled</li>
  <li>✅ System User has Full Control access to App and WhatsApp Account</li>
  <li>✅ Access token has required permissions (whatsapp_business_management, whatsapp_business_messaging)</li>
  <li>✅ Can successfully send messages using approved templates</li>
  <li>✅ Can create UTILITY and MARKETING templates</li>
  <li>❌ Cannot create AUTHENTICATION templates (blocked)</li>
</ul>

<hr>

<h3>OUR USE CASE:</h3>
<p>MyLeadX is a CRM and Lead Management platform. We need AUTHENTICATION templates to:</p>
<ol>
  <li><strong>User Login OTP</strong> - Verify user identity during login</li>
  <li><strong>Registration OTP</strong> - Verify phone number during account creation</li>
  <li><strong>Password Reset OTP</strong> - Secure password recovery process</li>
  <li><strong>Transaction Verification</strong> - Confirm sensitive actions</li>
</ol>

<hr>

<h3>TEMPLATE WE WANT TO CREATE:</h3>
<table border="1" cellpadding="8" cellspacing="0">
  <tr><td><strong>Template Name</strong></td><td>myleadx_otp_verify</td></tr>
  <tr><td><strong>Category</strong></td><td>AUTHENTICATION</td></tr>
  <tr><td><strong>Language</strong></td><td>English (en_US)</td></tr>
  <tr><td><strong>Purpose</strong></td><td>Send OTP codes for user verification</td></tr>
</table>

<hr>

<h3>REQUEST:</h3>
<p>Please enable AUTHENTICATION template creation capability for our WhatsApp Business Account (ID: 793425480137060).</p>
<p>We have completed all verification requirements and are compliant with WhatsApp Business policies.</p>

<hr>

<h3>CONTACT INFORMATION:</h3>
<table border="1" cellpadding="8" cellspacing="0">
  <tr><td><strong>Company</strong></td><td>SMARTGROW INFOTECH PRIVATE LIMITED</td></tr>
  <tr><td><strong>Website</strong></td><td>https://myleadx.ai</td></tr>
</table>

<p>We appreciate your prompt assistance in resolving this matter.</p>

<p>Thank you.</p>

<p>Best regards,<br>
<strong>SMARTGROW INFOTECH PRIVATE LIMITED</strong></p>
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      return;
    }

    console.log('Email sent successfully!');
    console.log('Email ID:', data.id);
  } catch (err) {
    console.error('Failed to send email:', err.message);
  }
}

sendSupportEmail();
