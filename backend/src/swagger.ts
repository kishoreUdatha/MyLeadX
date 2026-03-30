import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { config } from './config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CRM Lead Generation API',
      version: '1.0.0',
      description: `
# CRM Lead Generation API Documentation

A comprehensive CRM system for lead management, communication, and analytics.

## Features
- **Lead Management**: Create, update, track leads through the sales pipeline
- **Multi-channel Communication**: SMS, Email, WhatsApp, Voice (Twilio/Plivo)
- **AI Voice Agents**: Automated voice conversations with leads
- **Campaign Management**: Email and SMS campaigns with tracking
- **Payment Integration**: Razorpay for payment processing
- **Ad Integrations**: Facebook, Instagram, LinkedIn, Google Ads
- **Analytics & Reporting**: Comprehensive analytics and lead scoring

## Authentication
All protected endpoints require a JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <token>
\`\`\`

Obtain tokens by logging in via \`POST /api/auth/login\`.

## Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 10 attempts per 15 minutes
- Messaging endpoints: 30 requests per minute
      `,
      contact: {
        name: 'API Support',
        email: 'support@yourcompany.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: config.baseUrl || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Leads', description: 'Lead management' },
      { name: 'Forms', description: 'Custom forms' },
      { name: 'Landing Pages', description: 'Landing page builder' },
      { name: 'Campaigns', description: 'Email/SMS campaigns' },
      { name: 'Chatbot', description: 'AI chatbot' },
      { name: 'Payments', description: 'Payment processing' },
      { name: 'Voice AI', description: 'AI voice agents' },
      { name: 'Outbound Calls', description: 'Automated calling' },
      { name: 'Advanced', description: 'Lead scoring, scheduling, DNC, cleanup' },
      { name: 'Email Tracking', description: 'Email open/click tracking' },
      { name: 'Uploads', description: 'File uploads (S3/local)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        Lead: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            source: {
              type: 'string',
              enum: ['MANUAL', 'BULK_UPLOAD', 'FORM', 'LANDING_PAGE', 'CHATBOT', 'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'AD_GOOGLE', 'REFERRAL', 'WEBSITE', 'OTHER'],
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            },
            stageId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LeadCreate: {
          type: 'object',
          required: ['firstName', 'phone'],
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            alternatePhone: { type: 'string' },
            source: { type: 'string' },
            stageId: { type: 'string', format: 'uuid' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            customFields: { type: 'object' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            roleId: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Campaign: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['SMS', 'EMAIL', 'WHATSAPP'] },
            status: { type: 'string', enum: ['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'] },
            content: { type: 'string' },
            scheduledAt: { type: 'string', format: 'date-time' },
          },
        },
        VoiceAgent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            industry: { type: 'string', enum: ['EDUCATION', 'IT_RECRUITMENT', 'REAL_ESTATE', 'CUSTOMER_CARE', 'HEALTHCARE', 'FINANCE', 'ECOMMERCE', 'CUSTOM'] },
            isActive: { type: 'boolean' },
            systemPrompt: { type: 'string' },
            voiceId: { type: 'string' },
          },
        },
        LeadScore: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            leadId: { type: 'string', format: 'uuid' },
            overallScore: { type: 'integer', minimum: 0, maximum: 100 },
            grade: { type: 'string', enum: ['A_PLUS', 'A', 'B', 'C', 'D', 'F'] },
            engagementScore: { type: 'integer' },
            qualificationScore: { type: 'integer' },
            sentimentScore: { type: 'integer' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orderId: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/swagger-docs/*.yaml'],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CRM Lead Generation API',
  }));

  // JSON spec endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log(`Swagger docs available at ${config.baseUrl}/api-docs`);
}

export { swaggerSpec };
