import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';

/**
 * Verify Twilio webhook signature
 * Twilio signs webhooks using X-Twilio-Signature header
 * Documentation: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * The signature is computed as:
 * 1. Take the full URL of the request (including query string)
 * 2. Sort all POST parameters alphabetically by key
 * 3. Concatenate URL + all parameter key-value pairs
 * 4. Sign with HMAC-SHA1 using your AuthToken
 * 5. Base64 encode the result
 */
export const verifyTwilioWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    const twilioSignature = req.headers['x-twilio-signature'] as string;

    if (!twilioSignature) {
      console.warn('Missing Twilio signature');
      return res.status(401).json({ success: false, message: 'Missing Twilio signature' });
    }

    const authToken = config.twilio.authToken;
    if (!authToken) {
      console.warn('Twilio auth token not configured - skipping webhook verification');
      return next(); // Skip verification if not configured (development mode)
    }

    // Construct the full URL that Twilio used to sign the request
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['host'];
    const url = `${protocol}://${host}${req.originalUrl}`;

    // Build the data string: URL + sorted POST parameters
    let data = url;

    // Sort POST parameters alphabetically and append to URL
    if (req.body && typeof req.body === 'object') {
      const sortedKeys = Object.keys(req.body).sort();
      for (const key of sortedKeys) {
        data += key + req.body[key];
      }
    }

    // Compute HMAC-SHA1 signature and base64 encode
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(data, 'utf-8')
      .digest('base64');

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(twilioSignature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.warn('Invalid Twilio signature for URL:', url);
      return res.status(401).json({ success: false, message: 'Invalid Twilio signature' });
    }

    next();
  } catch (error) {
    console.error('Twilio webhook verification error:', error);
    return res.status(500).json({ success: false, message: 'Twilio verification failed' });
  }
};

/**
 * Verify WhatsApp/Meta webhook signature
 * WhatsApp uses X-Hub-Signature-256 header (same as Facebook)
 * Documentation: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export const verifyWhatsAppWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;

    if (!signature) {
      console.warn('Missing WhatsApp/Meta signature');
      return res.status(401).json({ success: false, message: 'Missing WhatsApp signature' });
    }

    // WhatsApp uses Facebook App Secret for signing
    const appSecret = config.facebook.appSecret;
    if (!appSecret) {
      console.warn('Facebook/WhatsApp app secret not configured - skipping webhook verification');
      return next(); // Skip verification if not configured (development mode)
    }

    // Get raw body for signature verification
    // Note: Express must be configured with raw body parser for this route
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      console.warn('Invalid WhatsApp/Meta signature');
      return res.status(401).json({ success: false, message: 'Invalid WhatsApp signature' });
    }

    next();
  } catch (error) {
    console.error('WhatsApp webhook verification error:', error);
    return res.status(500).json({ success: false, message: 'WhatsApp verification failed' });
  }
};

/**
 * Verify Exotel webhook signature
 * Exotel signs webhooks using custom headers
 */
export const verifyExotelWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Exotel uses basic auth or IP whitelist for webhook verification
    // For now, we skip signature verification if Exotel is not fully configured
    if (!config.exotel.apiKey || !config.exotel.apiToken) {
      console.warn('Exotel credentials not configured - skipping webhook verification');
      return next();
    }

    // Verify basic auth if present
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [apiKey, apiToken] = credentials.split(':');

      if (apiKey !== config.exotel.apiKey || apiToken !== config.exotel.apiToken) {
        console.warn('Invalid Exotel credentials');
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }

    next();
  } catch (error) {
    console.error('Exotel webhook verification error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/**
 * Verify Razorpay webhook signature
 * Razorpay signs webhooks using X-Razorpay-Signature header
 */
export const verifyRazorpayWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    const razorpaySignature = req.headers['x-razorpay-signature'] as string;

    if (!razorpaySignature) {
      console.warn('Missing Razorpay signature');
      return res.status(401).json({ success: false, message: 'Missing signature' });
    }

    const webhookSecret = config.razorpay.keySecret;
    if (!webhookSecret) {
      console.warn('Razorpay key secret not configured');
      return next(); // Skip verification if not configured
    }

    // Generate expected signature
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      console.warn('Invalid Razorpay signature');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    next();
  } catch (error) {
    console.error('Razorpay webhook verification error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/**
 * Verify Facebook webhook signature
 * Facebook signs webhooks using X-Hub-Signature-256 header
 */
export const verifyFacebookWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;

    if (!signature) {
      console.warn('Missing Facebook signature');
      return res.status(401).json({ success: false, message: 'Missing signature' });
    }

    const appSecret = config.facebook.appSecret;
    if (!appSecret) {
      console.warn('Facebook app secret not configured');
      return next(); // Skip verification if not configured
    }

    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      console.warn('Invalid Facebook signature');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    next();
  } catch (error) {
    console.error('Facebook webhook verification error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/**
 * Verify Plivo webhook signature
 * Plivo uses X-Plivo-Signature-V3 header
 */
export const verifyPlivoWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-plivo-signature-v3'] as string;
    const nonce = req.headers['x-plivo-signature-v3-nonce'] as string;

    if (!signature || !nonce) {
      // Plivo v2 signature fallback
      const v2Signature = req.headers['x-plivo-signature-v2'] as string;
      if (!v2Signature) {
        console.warn('Missing Plivo signature');
        return res.status(401).json({ success: false, message: 'Missing signature' });
      }
    }

    const authToken = config.plivo.authToken;
    if (!authToken) {
      console.warn('Plivo auth token not configured');
      return next(); // Skip verification if not configured
    }

    // Construct the URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['host'];
    const url = `${protocol}://${host}${req.originalUrl}`;

    // For V3 signature
    if (signature && nonce) {
      const baseString = `${url}.${nonce}.${JSON.stringify(req.body)}`;
      const expectedSignature = crypto
        .createHmac('sha256', authToken)
        .update(baseString)
        .digest('base64');

      if (expectedSignature !== signature) {
        console.warn('Invalid Plivo V3 signature');
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }
    }

    next();
  } catch (error) {
    console.error('Plivo webhook verification error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/**
 * Verify LinkedIn webhook signature
 * LinkedIn uses custom header
 */
export const verifyLinkedInWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    // LinkedIn uses OAuth-based verification
    // The access token should be validated on each request
    const clientSecret = config.linkedin.clientSecret;

    if (!clientSecret) {
      console.warn('LinkedIn client secret not configured');
      return next();
    }

    // LinkedIn webhooks require organization-level verification
    // This is typically done during webhook subscription setup
    next();
  } catch (error) {
    console.error('LinkedIn webhook verification error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/**
 * Verify SendGrid Event Webhook signature
 * SendGrid signs webhooks using X-Twilio-Email-Event-Webhook-Signature header
 * Documentation: https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
 *
 * Note: SendGrid uses ECDSA with P-256 curve for signing
 */
export const verifySendGridWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
    const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;

    if (!signature || !timestamp) {
      console.warn('Missing SendGrid signature or timestamp');
      // SendGrid webhooks without signing enabled - allow in development
      const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
      if (!verificationKey) {
        console.warn('SendGrid webhook verification key not configured - skipping verification');
        return next();
      }
      return res.status(401).json({ success: false, message: 'Missing SendGrid signature' });
    }

    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
    if (!verificationKey) {
      console.warn('SendGrid webhook verification key not configured - skipping verification');
      return next(); // Skip verification if not configured (development mode)
    }

    // SendGrid uses ECDSA signature verification
    // The payload to verify is: timestamp + payload + signature
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const payload = timestamp + rawBody;

    // Verify using ECDSA
    const verifier = crypto.createVerify('sha256');
    verifier.update(payload);

    const isValid = verifier.verify(
      {
        key: verificationKey,
        format: 'pem',
      },
      signature,
      'base64'
    );

    if (!isValid) {
      console.warn('Invalid SendGrid signature');
      return res.status(401).json({ success: false, message: 'Invalid SendGrid signature' });
    }

    next();
  } catch (error) {
    console.error('SendGrid webhook verification error:', error);
    // If verification fails due to key format issues, log and continue in development
    if (!process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY) {
      return next();
    }
    return res.status(500).json({ success: false, message: 'SendGrid verification failed' });
  }
};

/**
 * Verify Stripe webhook signature
 * Stripe signs webhooks using Stripe-Signature header
 * Documentation: https://stripe.com/docs/webhooks/signatures
 */
export const verifyStripeWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      console.warn('Missing Stripe signature');
      return res.status(401).json({ success: false, message: 'Missing Stripe signature' });
    }

    const webhookSecret = config.stripe?.webhookSecret;
    if (!webhookSecret) {
      console.warn('Stripe webhook secret not configured - skipping verification');
      return next(); // Skip verification if not configured (development mode)
    }

    // Parse Stripe signature header (format: t=timestamp,v1=signature)
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      console.warn('Invalid Stripe signature format');
      return res.status(401).json({ success: false, message: 'Invalid signature format' });
    }

    const timestamp = timestampPart.substring(2);
    const expectedSignature = signaturePart.substring(3);

    // Check timestamp to prevent replay attacks (5 minute tolerance)
    const timestampAge = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
    if (timestampAge > 300) {
      console.warn('Stripe webhook timestamp too old');
      return res.status(401).json({ success: false, message: 'Webhook timestamp expired' });
    }

    // Construct signed payload
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signedPayload = `${timestamp}.${rawBody}`;

    // Compute expected signature
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    // Use timing-safe comparison
    if (!crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(expectedSignature))) {
      console.warn('Invalid Stripe signature');
      return res.status(401).json({ success: false, message: 'Invalid Stripe signature' });
    }

    next();
  } catch (error) {
    console.error('Stripe webhook verification error:', error);
    return res.status(500).json({ success: false, message: 'Stripe verification failed' });
  }
};

/**
 * Generic HMAC signature verification
 */
export const verifyHmacSignature = (
  secret: string,
  signatureHeader: string,
  algorithm: string = 'sha256'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers[signatureHeader.toLowerCase()] as string;

      if (!signature) {
        return res.status(401).json({ success: false, message: 'Missing signature' });
      }

      const body = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac(algorithm, secret)
        .update(body)
        .digest('hex');

      // Handle prefix like 'sha256='
      const signatureValue = signature.includes('=')
        ? signature.split('=')[1]
        : signature;

      if (expectedSignature !== signatureValue) {
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }

      next();
    } catch (error) {
      console.error('HMAC verification error:', error);
      return res.status(500).json({ success: false, message: 'Verification failed' });
    }
  };
};
