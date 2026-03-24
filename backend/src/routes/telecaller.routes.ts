import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { telecallerCallFinalizationService } from '../services/telecaller-call-finalization.service';
import calendarService from '../services/calendar.service';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'recordings');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `telecall-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: mp3, wav, m4a, ogg, webm, aac'));
    }
  },
});

// Apply authentication
router.use(authenticate);
router.use(tenantMiddleware);

// ==================== TELECALLER DASHBOARD ====================

// Get telecaller's assigned leads (admin sees all leads)
router.get('/leads', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.roleSlug;
    const { status, search, limit = '50', offset = '0' } = req.query;

    const whereClause: any = {
      organizationId: req.organization!.id,
    };

    // Admin/Manager can see all leads, telecaller only sees assigned leads
    if (userRole !== 'admin' && userRole !== 'manager') {
      whereClause.assignments = {
        some: {
          assignedToId: userId,
          isActive: true,
        },
      };
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
        include: {
          assignments: {
            where: { isActive: true },
            include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
            take: 1,
          },
          _count: { select: { activities: true, notes: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.lead.count({ where: whereClause }),
    ]);

    ApiResponse.success(res, 'Leads retrieved', { leads, total });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get telecaller's call history
router.get('/calls', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { leadId, dateFrom, dateTo, limit = '50', offset = '0' } = req.query;

    const whereClause: any = {
      telecallerId: userId,
    };

    if (leadId) {
      whereClause.leadId = leadId;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo as string);
    }

    const [calls, total] = await Promise.all([
      prisma.telecallerCall.findMany({
        where: whereClause,
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.telecallerCall.count({ where: whereClause }),
    ]);

    ApiResponse.success(res, 'Calls retrieved', { calls, total });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get single call details
router.get('/calls/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const call = await prisma.telecallerCall.findFirst({
      where: { id, telecallerId: userId },
      include: {
        lead: true,
        telecaller: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!call) {
      return ApiResponse.error(res, 'Call not found', 404);
    }

    ApiResponse.success(res, 'Call retrieved', call);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Start a new call (log call initiation)
router.post('/calls', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { leadId, phoneNumber, contactName } = req.body;

    if (!phoneNumber) {
      return ApiResponse.error(res, 'Phone number is required', 400);
    }

    // Create call record
    const call = await prisma.telecallerCall.create({
      data: {
        organizationId: req.organization!.id,
        telecallerId: userId,
        leadId: leadId || null,
        phoneNumber,
        contactName: contactName || null,
        status: 'INITIATED',
        startedAt: new Date(),
      },
    });

    // Log activity on lead if exists
    if (leadId) {
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'CALL_MADE',
          title: 'Call initiated',
          description: `Telecaller initiated call to ${phoneNumber}`,
          userId,
        },
      });
    }

    ApiResponse.success(res, 'Call initiated', call, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Update call with outcome (after call ends)
router.put('/calls/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { status, outcome, notes, duration, endedAt } = req.body;

    const existing = await prisma.telecallerCall.findFirst({
      where: { id, telecallerId: userId },
    });

    if (!existing) {
      return ApiResponse.error(res, 'Call not found', 404);
    }

    const call = await prisma.telecallerCall.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(outcome && { outcome }),
        ...(notes && { notes }),
        ...(duration && { duration }),
        endedAt: endedAt ? new Date(endedAt) : new Date(),
      },
    });

    // Log activity if leadId exists
    if (existing.leadId && outcome) {
      // Log activity
      await prisma.leadActivity.create({
        data: {
          leadId: existing.leadId,
          type: 'CALL_MADE',
          title: 'Call completed',
          description: `Call completed - Outcome: ${outcome}${notes ? `. Notes: ${notes}` : ''}`,
          userId,
        },
      });
    }

    ApiResponse.success(res, 'Call updated', call);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Upload call recording
router.post('/calls/:id/recording', upload.single('recording'), async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!req.file) {
      return ApiResponse.error(res, 'Recording file is required', 400);
    }

    const existing = await prisma.telecallerCall.findFirst({
      where: { id, telecallerId: userId },
    });

    if (!existing) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return ApiResponse.error(res, 'Call not found', 404);
    }

    // Update call with recording URL
    const recordingUrl = `/uploads/recordings/${req.file.filename}`;

    let call = await prisma.telecallerCall.update({
      where: { id },
      data: {
        recordingUrl,
        status: 'COMPLETED',
      },
    });

    // Process with full AI analysis asynchronously (transcription, sentiment, outcome, scoring, etc.)
    telecallerCallFinalizationService.processRecording(id, req.file.path).catch(console.error);

    ApiResponse.success(res, 'Recording uploaded. AI analysis in progress...', call);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Note: AI analysis is now handled by telecaller-call-finalization.service.ts
// which provides full AI-powered analysis including:
// - Transcription (Sarvam/Whisper)
// - Sentiment Analysis (OpenAI)
// - Outcome Detection (OpenAI)
// - Summary Generation (OpenAI)
// - Lead Scoring
// - Lead Lifecycle Integration
// - Auto Follow-up Scheduling

// Get telecaller stats/dashboard
router.get('/stats', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLeads,
      todayCalls,
      totalCalls,
      outcomes,
    ] = await Promise.all([
      // Total assigned leads
      prisma.lead.count({
        where: {
          organizationId: req.organization!.id,
          assignments: { some: { assignedToId: userId, isActive: true } },
        },
      }),
      // Today's calls
      prisma.telecallerCall.count({
        where: { telecallerId: userId, createdAt: { gte: today } },
      }),
      // Total calls
      prisma.telecallerCall.count({
        where: { telecallerId: userId },
      }),
      // Outcome distribution
      prisma.telecallerCall.groupBy({
        by: ['outcome'],
        where: { telecallerId: userId, outcome: { not: null } },
        _count: { outcome: true },
      }),
    ]);

    // Calculate conversion rate
    const interested = outcomes.find(o => o.outcome === 'INTERESTED')?._count?.outcome || 0;
    const converted = outcomes.find(o => o.outcome === 'CONVERTED')?._count?.outcome || 0;
    const conversionRate = totalCalls > 0 ? Math.round(((interested + converted) / totalCalls) * 100) : 0;

    ApiResponse.success(res, 'Stats retrieved', {
      totalLeads,
      todayCalls,
      totalCalls,
      conversionRate,
      outcomes: outcomes.reduce((acc, o) => {
        if (o.outcome) acc[o.outcome] = o._count.outcome;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get AI analysis status for a call
router.get('/calls/:id/analysis', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const call = await prisma.telecallerCall.findFirst({
      where: { id, telecallerId: userId },
      select: {
        id: true,
        aiAnalyzed: true,
        transcript: true,
        sentiment: true,
        outcome: true,
        summary: true,
        qualification: true,
        recordingUrl: true,
        duration: true,
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            leadScore: true,
          },
        },
      },
    });

    if (!call) {
      return ApiResponse.error(res, 'Call not found', 404);
    }

    ApiResponse.success(res, 'Analysis retrieved', {
      ...call,
      analysisStatus: call.aiAnalyzed ? 'completed' : 'pending',
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Manually trigger AI re-analysis for a call
router.post('/calls/:id/reanalyze', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const call = await prisma.telecallerCall.findFirst({
      where: { id, telecallerId: userId },
    });

    if (!call) {
      return ApiResponse.error(res, 'Call not found', 404);
    }

    if (!call.recordingUrl) {
      return ApiResponse.error(res, 'No recording available for this call', 400);
    }

    // Get file path from recording URL
    const filePath = path.join(process.cwd(), call.recordingUrl);

    if (!fs.existsSync(filePath)) {
      return ApiResponse.error(res, 'Recording file not found', 404);
    }

    // Reset analysis status
    await prisma.telecallerCall.update({
      where: { id },
      data: { aiAnalyzed: false },
    });

    // Trigger re-analysis
    telecallerCallFinalizationService.processRecording(id, filePath).catch(console.error);

    ApiResponse.success(res, 'Re-analysis started', { callId: id });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get calls with AI analysis summary
router.get('/calls-analyzed', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = '20', offset = '0', analyzed } = req.query;

    const whereClause: any = {
      telecallerId: userId,
    };

    if (analyzed === 'true') {
      whereClause.aiAnalyzed = true;
    } else if (analyzed === 'false') {
      whereClause.aiAnalyzed = false;
    }

    const [calls, total] = await Promise.all([
      prisma.telecallerCall.findMany({
        where: whereClause,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              leadScore: {
                select: {
                  overallScore: true,
                  grade: true,
                  aiClassification: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.telecallerCall.count({ where: whereClause }),
    ]);

    ApiResponse.success(res, 'Analyzed calls retrieved', { calls, total });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== APPOINTMENTS ====================

/**
 * Book a new appointment
 * POST /api/telecaller/appointments
 */
router.post('/appointments', async (req: TenantRequest, res: Response) => {
  try {
    const {
      leadId,
      title,
      description,
      scheduledAt,
      duration = 30,
      locationType = 'PHONE',
      locationDetails,
      contactName,
      contactPhone,
      contactEmail,
      sendCalendarInvite = true,
      sendReminders = true,
    } = req.body;

    const organizationId = req.organizationId!;
    const userId = req.user!.id;

    // Create appointment in database
    const appointment = await prisma.appointment.create({
      data: {
        organizationId,
        leadId,
        title,
        description,
        scheduledAt: new Date(scheduledAt),
        duration,
        locationType,
        locationDetails,
        contactName,
        contactPhone,
        contactEmail,
        status: 'SCHEDULED',
      },
    });

    // Send calendar invite if requested and email is available
    let calendarEventId: string | null = null;
    let calendarEventLink: string | null = null;

    if (sendCalendarInvite && contactEmail) {
      try {
        const endTime = new Date(new Date(scheduledAt).getTime() + duration * 60000);

        const calendarResult = await calendarService.createEvent(organizationId, {
          title,
          description: description || `Appointment with ${contactName}`,
          startTime: new Date(scheduledAt),
          endTime,
          attendees: [{ email: contactEmail, name: contactName }],
          location: locationDetails || (locationType === 'PHONE' ? `Phone: ${contactPhone}` : undefined),
          reminders: sendReminders ? [
            { minutes: 60, method: 'email' },
            { minutes: 15, method: 'popup' },
          ] : undefined,
        });

        if (calendarResult) {
          calendarEventId = calendarResult.eventId;
          calendarEventLink = calendarResult.eventLink;

          // Update appointment with calendar event info
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: {
              notes: `Calendar Event ID: ${calendarEventId}`,
            },
          });
        }
      } catch (calError) {
        console.error('[Telecaller] Failed to create calendar event:', calError);
        // Don't fail the appointment creation if calendar fails
      }
    }

    // Create follow-up for the lead
    if (leadId) {
      await prisma.followUp.create({
        data: {
          leadId,
          createdById: userId,
          assigneeId: userId,
          scheduledAt: new Date(scheduledAt),
          followUpType: locationType === 'PHONE' ? 'HUMAN_CALL' : 'MEETING',
          status: 'UPCOMING',
          message: title,
          notes: description,
        },
      });

      // Update lead's next follow-up date
      await prisma.lead.update({
        where: { id: leadId },
        data: { nextFollowUpAt: new Date(scheduledAt) },
      });

      // Log activity
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'FOLLOWUP_SCHEDULED',
          title: 'Appointment Scheduled',
          description: `${title} - ${new Date(scheduledAt).toLocaleString()}`,
          userId,
          metadata: {
            appointmentId: appointment.id,
            calendarEventId,
            calendarInviteSent: !!calendarEventId,
          },
        },
      });
    }

    ApiResponse.success(res, 'Appointment booked successfully', {
      ...appointment,
      calendarEventId,
      calendarEventLink,
      calendarInviteSent: !!calendarEventId,
    });
  } catch (error) {
    console.error('[Telecaller] Error booking appointment:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Quick book appointment
 * POST /api/telecaller/appointments/quick-book
 */
router.post('/appointments/quick-book', async (req: TenantRequest, res: Response) => {
  try {
    const { leadId, contactName, contactPhone, contactEmail, scheduledAt, duration = 30 } = req.body;
    const organizationId = req.organizationId!;
    const userId = req.user!.id;

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        organizationId,
        leadId,
        title: 'Follow-up Call',
        scheduledAt: new Date(scheduledAt),
        duration,
        locationType: 'PHONE',
        locationDetails: contactPhone,
        contactName,
        contactPhone,
        contactEmail,
        status: 'SCHEDULED',
      },
    });

    // Send calendar invite
    let calendarResult = null;
    if (contactEmail) {
      try {
        const endTime = new Date(new Date(scheduledAt).getTime() + duration * 60000);
        calendarResult = await calendarService.createEvent(organizationId, {
          title: 'Follow-up Call',
          description: `Follow-up call with ${contactName}`,
          startTime: new Date(scheduledAt),
          endTime,
          attendees: [{ email: contactEmail, name: contactName }],
          location: `Phone: ${contactPhone}`,
          reminders: [
            { minutes: 60, method: 'email' },
            { minutes: 15, method: 'popup' },
          ],
        });
      } catch (e) {
        console.log('[Telecaller] Calendar invite failed:', e);
      }
    }

    // Create follow-up and log activity
    if (leadId) {
      await prisma.followUp.create({
        data: {
          leadId,
          createdById: userId,
          assigneeId: userId,
          scheduledAt: new Date(scheduledAt),
          followUpType: 'HUMAN_CALL',
          status: 'UPCOMING',
          message: 'Follow-up Call',
        },
      });

      await prisma.lead.update({
        where: { id: leadId },
        data: { nextFollowUpAt: new Date(scheduledAt) },
      });

      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'FOLLOWUP_SCHEDULED',
          title: 'Quick Appointment Booked',
          description: `Follow-up call scheduled for ${new Date(scheduledAt).toLocaleString()}`,
          userId,
          metadata: { appointmentId: appointment.id, quickBook: true },
        },
      });
    }

    ApiResponse.success(res, 'Appointment booked', {
      ...appointment,
      calendarEventId: calendarResult?.eventId,
      calendarEventLink: calendarResult?.eventLink,
      calendarInviteSent: !!calendarResult,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Get available time slots
 * GET /api/telecaller/appointments/available-slots
 */
router.get('/appointments/available-slots', async (req: TenantRequest, res: Response) => {
  try {
    const { date } = req.query;
    const organizationId = req.organizationId!;

    if (!date) {
      return ApiResponse.error(res, 'Date is required', 400);
    }

    // Get existing appointments for the date
    const startOfDay = new Date(date as string);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date as string);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        organizationId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
      },
      select: {
        scheduledAt: true,
        duration: true,
      },
    });

    // Generate available slots (9 AM to 6 PM, 30-minute intervals)
    const slots = [];
    const slotDate = new Date(date as string);

    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slotDate.setHours(hour, minute, 0, 0);
        const slotStart = new Date(slotDate);
        const slotEnd = new Date(slotDate.getTime() + 30 * 60000);

        // Check if slot conflicts with existing appointments
        const isAvailable = !existingAppointments.some((appt) => {
          const apptStart = new Date(appt.scheduledAt);
          const apptEnd = new Date(apptStart.getTime() + appt.duration * 60000);
          return slotStart < apptEnd && slotEnd > apptStart;
        });

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          available: isAvailable,
        });
      }
    }

    ApiResponse.success(res, 'Available slots retrieved', slots);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Cancel appointment
 * POST /api/telecaller/appointments/:id/cancel
 */
router.post('/appointments/:id/cancel', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const organizationId = req.organizationId!;

    const appointment = await prisma.appointment.update({
      where: { id, organizationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
      },
    });

    // TODO: Cancel calendar event if exists

    ApiResponse.success(res, 'Appointment cancelled', appointment);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Reschedule appointment
 * POST /api/telecaller/appointments/:id/reschedule
 */
router.post('/appointments/:id/reschedule', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;
    const organizationId = req.organizationId!;

    const appointment = await prisma.appointment.update({
      where: { id, organizationId },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: 'RESCHEDULED',
      },
    });

    // Update lead follow-up
    if (appointment.leadId) {
      await prisma.lead.update({
        where: { id: appointment.leadId },
        data: { nextFollowUpAt: new Date(scheduledAt) },
      });
    }

    // TODO: Update calendar event if exists

    ApiResponse.success(res, 'Appointment rescheduled', appointment);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
