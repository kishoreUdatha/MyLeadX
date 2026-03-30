import { Request, Response, NextFunction } from 'express';
import { apiKeyService, ApiPermission } from '../services/api-key.service';

export interface ApiAuthRequest extends Request {
  apiKey?: any;
  organizationId?: string;
}

/**
 * Authenticate API requests using API key
 */
export const apiAuth = async (
  req: ApiAuthRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  try {
    // Get API key from header
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'] as string;

    let rawKey: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawKey = authHeader.substring(7);
    } else if (apiKeyHeader) {
      rawKey = apiKeyHeader;
    }

    if (!rawKey) {
      return res.status(401).json({
        success: false,
        error: 'API key is required',
        code: 'MISSING_API_KEY',
      });
    }

    // Validate API key
    const result = await apiKeyService.validateApiKey(rawKey);

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        error: result.error,
        code: 'INVALID_API_KEY',
      });
    }

    const apiKey = result.apiKey;

    // Check IP restriction
    const clientIP = req.ip || req.socket.remoteAddress;
    const allowedIPs = apiKey.allowedIPs as string[];

    if (allowedIPs && allowedIPs.length > 0) {
      if (!allowedIPs.includes(clientIP!)) {
        await logRequest(apiKey.id, req, 403, Date.now() - startTime, 'IP not allowed');
        return res.status(403).json({
          success: false,
          error: 'IP address not allowed',
          code: 'IP_NOT_ALLOWED',
        });
      }
    }

    // Check rate limit
    const withinLimit = await apiKeyService.checkRateLimit(
      apiKey.id,
      apiKey.rateLimit,
      apiKey.rateLimitWindow
    );

    if (!withinLimit) {
      await logRequest(apiKey.id, req, 429, Date.now() - startTime, 'Rate limit exceeded');
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: apiKey.rateLimitWindow,
      });
    }

    // Attach API key info to request
    req.apiKey = apiKey;
    req.organizationId = apiKey.organizationId;

    // Log successful authentication and continue
    res.on('finish', () => {
      logRequest(apiKey.id, req, res.statusCode, Date.now() - startTime);
    });

    next();
  } catch (error) {
    console.error('API auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Check for specific permission
 */
export const requirePermission = (permission: ApiPermission) => {
  return (req: ApiAuthRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    if (!apiKeyService.hasPermission(req.apiKey, permission)) {
      return res.status(403).json({
        success: false,
        error: `Missing permission: ${permission}`,
        code: 'PERMISSION_DENIED',
      });
    }

    next();
  };
};

/**
 * Check if API key can access specific agent
 */
export const requireAgentAccess = (agentIdParam: string = 'agentId') => {
  return (req: ApiAuthRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const agentId = req.params[agentIdParam] || req.body.agentId;

    if (agentId && !apiKeyService.canAccessAgent(req.apiKey, agentId)) {
      return res.status(403).json({
        success: false,
        error: 'Access to this agent is not allowed',
        code: 'AGENT_ACCESS_DENIED',
      });
    }

    next();
  };
};

/**
 * Log API request
 */
async function logRequest(
  apiKeyId: string,
  req: Request,
  statusCode: number,
  responseTime: number,
  errorMessage?: string
) {
  try {
    await apiKeyService.logUsage({
      apiKeyId,
      endpoint: req.path,
      method: req.method,
      statusCode,
      responseTime,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      agentId: req.params.agentId || req.body?.agentId,
      sessionId: req.params.sessionId || req.body?.sessionId,
      errorMessage,
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}
