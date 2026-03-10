import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { config } from './config';
import { connectDatabase } from './config/database';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimit';
import { rateLimiters } from './services/rate-limit.service';
import { auditMiddleware } from './middlewares/audit';
import { websocketService } from './services/websocket.service';
import { setupSwagger } from './swagger';
import testCallRoutes from './routes/test-call.routes';
import voicebotRoutes, { initializeVoiceBotWebSocket } from './routes/voicebot.routes';
import { jobQueueService } from './services/job-queue.service';
import fs from 'fs';
import path from 'path';

const app = express();
const httpServer = createServer(app);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files
app.use('/uploads', express.static(uploadsDir));

// Public demo pages (no auth required)
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use('/demo', express.static(publicDir));

// Audio files for TTS (ElevenLabs generated audio)
const audioDir = path.join(__dirname, '../public/audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}
app.use('/audio', express.static(audioDir));

// Rate limiting
app.use('/api', apiLimiter);

// Audit logging
app.use('/api', auditMiddleware);

// Swagger documentation
setupSwagger(app);

// Test call page (no auth required for testing)
app.use('/test-call', testCallRoutes);

// Voice Bot routes (no auth required for Exotel webhooks)
app.use('/api/voicebot', voicebotRoutes);

// API routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    await connectDatabase();

    // Initialize WebSocket for real-time updates
    websocketService.initialize(httpServer);

    // Initialize Voice Bot WebSocket for Exotel streaming
    initializeVoiceBotWebSocket(httpServer);

    // Start scheduled call checker (checks every minute for callbacks)
    jobQueueService.startScheduledCallChecker();

    httpServer.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`WebSocket enabled`);
      console.log(`Voice Bot WebSocket: wss://${config.baseUrl?.replace('https://', '').replace('http://', '')}/voice-stream`);
      console.log(`Environment: ${config.env}`);
      console.log(`API docs available at ${config.baseUrl}/api-docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
