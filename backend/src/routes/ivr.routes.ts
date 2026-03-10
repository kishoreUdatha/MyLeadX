import { Router, Request, Response } from 'express';
import { ivrService } from '../services/ivr.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { IvrNodeType } from '@prisma/client';

const router = Router();

// ==================== WEBHOOKS (No Auth - Called by Telephony Providers) ====================

// Inbound call webhook - entry point for IVR
router.post('/webhook/inbound', async (req: Request, res: Response) => {
  try {
    const { CallSid, From, To, CallerName } = req.body;

    console.log(`IVR: Incoming call from ${From} to ${To} (SID: ${CallSid})`);

    // Find IVR flow for this phone number
    const flow = await ivrService.getFlowForNumber(To);

    if (!flow) {
      // No IVR configured, return default response
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Thank you for calling. Please hold while we connect you.</Say>
          <Hangup/>
        </Response>`);
      return;
    }

    // Execute the IVR flow
    const context = {
      callSid: CallSid,
      callerNumber: From,
      calledNumber: To,
      variables: {},
      inputs: [],
    };

    const result = await ivrService.executeFlow(flow.id, context);

    // Generate TwiML based on action
    const twiml = generateTwiML(result, flow.id, CallSid);

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('IVR webhook error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're sorry, an error occurred. Please try again later.</Say>
        <Hangup/>
      </Response>`);
  }
});

// DTMF input webhook
router.post('/webhook/gather/:flowId/:nodeId', async (req: Request, res: Response) => {
  try {
    const { flowId, nodeId } = req.params;
    const { Digits, CallSid, From, To } = req.body;

    console.log(`IVR: DTMF input ${Digits} for flow ${flowId}, node ${nodeId}`);

    const context = {
      callSid: CallSid,
      callerNumber: From,
      calledNumber: To,
      currentNodeId: nodeId,
      variables: {},
      inputs: [],
    };

    const result = await ivrService.handleDtmfInput(flowId, nodeId, Digits, context);

    const twiml = generateTwiML(result, flowId, CallSid);

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('IVR gather webhook error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Invalid input. Please try again.</Say>
        <Redirect>/api/ivr/webhook/inbound</Redirect>
      </Response>`);
  }
});

// Helper function to generate TwiML
function generateTwiML(
  result: { action: string; data: Record<string, unknown>; nextNodeId?: string },
  flowId: string,
  callSid: string
): string {
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

  switch (result.action) {
    case 'play':
      if (result.data.audioUrl) {
        twiml += `<Play>${result.data.audioUrl}</Play>`;
      } else if (result.data.text) {
        twiml += `<Say>${result.data.text}</Say>`;
      }
      if (result.nextNodeId) {
        twiml += `<Redirect>/api/ivr/webhook/gather/${flowId}/${result.nextNodeId}</Redirect>`;
      }
      break;

    case 'gather':
      twiml += `<Gather action="/api/ivr/webhook/gather/${flowId}/${result.nextNodeId || 'next'}" `;
      twiml += `numDigits="${result.data.numDigits || 1}" `;
      twiml += `timeout="${result.data.timeout || 10}">`;
      if (result.data.text) {
        twiml += `<Say>${result.data.text}</Say>`;
      }
      twiml += '</Gather>';
      twiml += `<Say>${result.data.text || 'We did not receive any input. Goodbye.'}</Say>`;
      break;

    case 'queue':
      twiml += `<Enqueue waitUrl="/api/ivr/webhook/hold-music">${result.data.queueId}</Enqueue>`;
      break;

    case 'transfer':
      if (result.data.type === 'warm') {
        twiml += `<Dial timeout="30"><Number>${result.data.number}</Number></Dial>`;
      } else {
        twiml += `<Dial><Number>${result.data.number}</Number></Dial>`;
      }
      break;

    case 'voicemail':
      twiml += `<Say>${result.data.greeting || 'Please leave a message after the beep.'}</Say>`;
      twiml += `<Record maxLength="${result.data.maxDuration || 120}" `;
      twiml += `recordingStatusCallback="/api/voicemail/webhook/recording" />`;
      break;

    case 'hangup':
      if (result.data.message) {
        twiml += `<Say>${result.data.message}</Say>`;
      }
      twiml += '<Hangup/>';
      break;

    case 'replay':
      twiml += `<Say>${result.data.message}</Say>`;
      twiml += `<Redirect>/api/ivr/webhook/inbound</Redirect>`;
      break;

    default:
      twiml += '<Hangup/>';
  }

  twiml += '</Response>';
  return twiml;
}

// ==================== AUTHENTICATED ROUTES ====================

router.use(authenticate);
router.use(tenantMiddleware);

// === IVR Flows ===

// Get all IVR flows
router.get('/flows', async (req: TenantRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, isActive, search } = req.query;

    const result = await ivrService.getFlows(
      {
        organizationId: req.organizationId!,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        search: search as string,
      },
      Number(page),
      Number(limit)
    );

    return ApiResponse.paginated(res, 'IVR flows retrieved', result.flows, result.page, result.limit, result.total);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Get single IVR flow
router.get('/flows/:id', async (req: TenantRequest, res: Response) => {
  try {
    const flow = await ivrService.getFlowById(req.params.id, req.organizationId!);
    return ApiResponse.success(res, 'IVR flow retrieved', flow);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Create IVR flow
router.post('/flows', async (req: TenantRequest, res: Response) => {
  try {
    const { name, description, welcomeMessage, timeoutSeconds, maxRetries, invalidInputMessage } = req.body;

    const flow = await ivrService.createFlow({
      organizationId: req.organizationId!,
      name,
      description,
      welcomeMessage,
      timeoutSeconds,
      maxRetries,
      invalidInputMessage,
    });

    return ApiResponse.created(res, 'IVR flow created', flow);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Update IVR flow
router.put('/flows/:id', async (req: TenantRequest, res: Response) => {
  try {
    const flow = await ivrService.updateFlow(req.params.id, req.organizationId!, req.body);
    return ApiResponse.success(res, 'IVR flow updated', flow);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Publish IVR flow
router.post('/flows/:id/publish', async (req: TenantRequest, res: Response) => {
  try {
    const flow = await ivrService.publishFlow(req.params.id, req.organizationId!);
    return ApiResponse.success(res, 'Flow published successfully', flow);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Delete IVR flow
router.delete('/flows/:id', async (req: TenantRequest, res: Response) => {
  try {
    await ivrService.deleteFlow(req.params.id, req.organizationId!);
    return ApiResponse.success(res, 'Flow deleted successfully', null);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// === Phone Number Mapping ===

// Assign phone number to flow
router.post('/phone-numbers', async (req: TenantRequest, res: Response) => {
  try {
    const { phoneNumber, flowId, phoneNumberId } = req.body;

    const mapping = await ivrService.assignPhoneNumber(
      req.organizationId!,
      phoneNumber,
      flowId,
      phoneNumberId
    );

    return ApiResponse.created(res, 'Phone number assigned', mapping);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Unassign phone number
router.delete('/phone-numbers/:phoneNumber', async (req: TenantRequest, res: Response) => {
  try {
    await ivrService.unassignPhoneNumber(req.organizationId!, req.params.phoneNumber);
    return ApiResponse.success(res, 'Phone number unassigned', null);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// === IVR Nodes ===

// Get nodes
router.get('/nodes', async (req: TenantRequest, res: Response) => {
  try {
    const { type } = req.query;
    const nodes = await ivrService.getNodes(
      req.organizationId!,
      type as IvrNodeType | undefined
    );
    return ApiResponse.success(res, 'IVR nodes retrieved', nodes);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Create node
router.post('/nodes', async (req: TenantRequest, res: Response) => {
  try {
    const node = await ivrService.createNode({
      organizationId: req.organizationId!,
      ...req.body,
    });
    return ApiResponse.created(res, 'IVR node created', node);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

export default router;
