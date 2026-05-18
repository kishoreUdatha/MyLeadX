/**
 * Daily Manager Digest Report
 *
 * Builds a per-day rollup of org activity grouped by manager:
 *  - At-a-glance totals (today vs yesterday)
 *  - Performance by manager (their direct-reports' aggregated metrics + branch)
 *  - Top / bottom telecallers
 *  - Conversion details (lead, value, closer)
 *  - Interested leads list
 *  - Action items (overdue follow-ups)
 *
 * Output: HTML email body + Excel attachment.
 * Sent to admins/managers via the existing auto-reports scheduler.
 *
 * Tenant-safe: every query is filtered by organizationId. Uses universal Lead
 * conversion fields (isConverted/convertedAt/actualValue), not industry-specific
 * tables like Admission — works for any vertical.
 */

import ExcelJS from 'exceljs';
import { prisma } from '../config/database';

// ============================================================================
// Types
// ============================================================================

export interface AtAGlanceTotals {
  totalCalls: number;
  callsConnected: number;
  connectRatePct: number;
  newLeads: number;
  interested: number;
  converted: number;
  lostOrNotInterested: number;
  followUpsCompleted: number;
  overdueFollowUps: number;
}

export interface ManagerRow {
  managerId: string;
  managerName: string;
  branchName: string;
  teamSize: number;
  calls: number;
  connected: number;
  connectRatePct: number;
  interested: number;
  converted: number;
}

export interface TelecallerRow {
  userId: string;
  userName: string;
  managerName: string;
  branchName: string;
  calls: number;
  connected: number;
  interested: number;
  converted: number;
}

export interface ConversionRow {
  leadId: string;
  leadName: string;
  phone: string;
  source: string;
  stageName: string;
  value: number;
  closedByName: string;
  managerName: string;
}

export interface InterestedRow {
  leadId: string;
  leadName: string;
  phone: string;
  source: string;
  telecallerName: string;
  managerName: string;
  nextFollowUpAt: Date | null;
}

export interface DigestData {
  organizationId: string;
  organizationName: string;
  reportDate: Date; // start of the reporting day (yesterday by default)
  reportDateLabel: string; // e.g. "Wednesday, 13 May 2026"
  generatedAt: Date;
  /** When the digest is branch-scoped, a human label like "Hyderabad branch" or "Hyderabad + Bengaluru". Absent = org-wide. */
  scopeLabel?: string;
  totals: AtAGlanceTotals;
  totalsPrior: AtAGlanceTotals; // same metrics for the prior day, for Δ
  managerRows: ManagerRow[];
  topPerformers: TelecallerRow[];
  bottomPerformers: TelecallerRow[];
  conversions: ConversionRow[];
  interestedLeads: InterestedRow[];
  revenueAdded: number;
}

export interface DigestOptions {
  /** Day to report on. Defaults to yesterday. */
  referenceDate?: Date;
  /** Restrict every aggregation to users/leads in these branches. Omit or empty = org-wide (admin view). */
  branchIds?: string[];
  /** Optional human-friendly label for the scope, shown in the email header. */
  scopeLabel?: string;
}

// ============================================================================
// Service
// ============================================================================

class DailyManagerDigestService {
  /**
   * Build the digest data for one organization on a given reference date.
   * The "report day" is the local-server day that contains referenceDate.
   * Default is yesterday — the digest is sent the morning after.
   *
   * If `options.branchIds` is provided, all aggregations restrict to users in
   * those branches (per-recipient branch scoping for managers). Org-wide is the
   * default and the admin view.
   */
  async getDigestData(
    organizationId: string,
    options: DigestOptions = {}
  ): Promise<DigestData> {
    const { referenceDate, scopeLabel } = options;
    const branchIds = options.branchIds?.length ? options.branchIds : undefined;

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    const reportDay = startOfDay(referenceDate ?? yesterday());
    const reportDayEnd = endOfDay(reportDay);
    const priorDay = startOfDay(addDays(reportDay, -1));
    const priorDayEnd = endOfDay(priorDay);

    const [
      totals,
      totalsPrior,
      managerRows,
      perTelecaller,
      conversions,
      interestedLeads,
    ] = await Promise.all([
      this.computeTotals(organizationId, reportDay, reportDayEnd, branchIds),
      this.computeTotals(organizationId, priorDay, priorDayEnd, branchIds),
      this.computePerManager(organizationId, reportDay, reportDayEnd, branchIds),
      this.computePerTelecaller(organizationId, reportDay, reportDayEnd, branchIds),
      this.computeConversions(organizationId, reportDay, reportDayEnd, branchIds),
      this.computeInterested(organizationId, reportDay, reportDayEnd, branchIds),
    ]);

    const topPerformers = [...perTelecaller]
      .filter((t) => t.calls > 0)
      .sort((a, b) =>
        b.converted - a.converted || b.connected - a.connected || b.calls - a.calls
      )
      .slice(0, 5);

    const bottomPerformers = [...perTelecaller]
      .filter((t) => t.calls > 0 && t.calls < 10)
      .sort((a, b) => a.calls - b.calls)
      .slice(0, 3);

    const revenueAdded = conversions.reduce((sum, c) => sum + c.value, 0);

    return {
      organizationId,
      organizationName: org.name,
      reportDate: reportDay,
      reportDateLabel: formatDateLabel(reportDay),
      generatedAt: new Date(),
      scopeLabel,
      totals,
      totalsPrior,
      managerRows,
      topPerformers,
      bottomPerformers,
      conversions,
      interestedLeads,
      revenueAdded,
    };
  }

  // --------------------------------------------------------------------------
  // Aggregations
  // --------------------------------------------------------------------------

  private async computeTotals(
    organizationId: string,
    start: Date,
    end: Date,
    branchIds?: string[]
  ): Promise<AtAGlanceTotals> {
    // Branch scoping:
    //  - TelecallerCall has no branchId of its own → filter via the caller's branch.
    //  - Lead has a direct orgBranchId.
    //  - FollowUp has no branch column → filter via the parent lead's orgBranchId.
    const callBranchFilter = branchIds
      ? { telecaller: { is: { branchId: { in: branchIds } } } }
      : {};
    const leadBranchFilter = branchIds ? { orgBranchId: { in: branchIds } } : {};
    const followUpLeadFilter = branchIds
      ? { is: { organizationId, orgBranchId: { in: branchIds } } }
      : { is: { organizationId } };

    const [
      totalCalls,
      callsConnected,
      newLeads,
      interested,
      converted,
      lostOrNotInterested,
      followUpsCompleted,
      overdueFollowUps,
    ] = await Promise.all([
      prisma.telecallerCall.count({
        where: { organizationId, createdAt: { gte: start, lte: end }, ...callBranchFilter },
      }),
      prisma.telecallerCall.count({
        where: {
          organizationId,
          status: 'COMPLETED',
          createdAt: { gte: start, lte: end },
          ...callBranchFilter,
        },
      }),
      prisma.lead.count({
        where: { organizationId, createdAt: { gte: start, lte: end }, ...leadBranchFilter },
      }),
      prisma.telecallerCall.count({
        where: {
          organizationId,
          outcome: 'INTERESTED',
          createdAt: { gte: start, lte: end },
          ...callBranchFilter,
        },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          isConverted: true,
          convertedAt: { gte: start, lte: end },
          ...leadBranchFilter,
        },
      }),
      prisma.telecallerCall.count({
        where: {
          organizationId,
          outcome: 'NOT_INTERESTED',
          createdAt: { gte: start, lte: end },
          ...callBranchFilter,
        },
      }),
      prisma.followUp.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: start, lte: end },
          lead: followUpLeadFilter,
        },
      }),
      // Overdue is a "now" snapshot, not bound to the report day.
      prisma.followUp.count({
        where: {
          status: 'UPCOMING',
          scheduledAt: { lt: new Date() },
          lead: followUpLeadFilter,
        },
      }),
    ]);

    return {
      totalCalls,
      callsConnected,
      connectRatePct: pct(callsConnected, totalCalls),
      newLeads,
      interested,
      converted,
      lostOrNotInterested,
      followUpsCompleted,
      overdueFollowUps,
    };
  }

  /**
   * Per-manager rollup. A "manager" here is any user that has at least one
   * direct report (User.managerId pointing back to them) and is active.
   * Team metrics are aggregated across the manager's direct reports.
   */
  private async computePerManager(
    organizationId: string,
    start: Date,
    end: Date,
    branchIds?: string[]
  ): Promise<ManagerRow[]> {
    const managers = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        teamMembers: { some: { isActive: true } },
        ...(branchIds ? { branchId: { in: branchIds } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        branch: { select: { name: true } },
        teamMembers: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    const rows: ManagerRow[] = [];

    for (const m of managers) {
      const teamIds = m.teamMembers.map((s) => s.id);
      if (teamIds.length === 0) continue;

      const [calls, connected, interested, converted] = await Promise.all([
        prisma.telecallerCall.count({
          where: {
            organizationId,
            telecallerId: { in: teamIds },
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.telecallerCall.count({
          where: {
            organizationId,
            telecallerId: { in: teamIds },
            status: 'COMPLETED',
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.telecallerCall.count({
          where: {
            organizationId,
            telecallerId: { in: teamIds },
            outcome: 'INTERESTED',
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.lead.count({
          where: {
            organizationId,
            isConverted: true,
            convertedAt: { gte: start, lte: end },
            assignments: {
              some: { isActive: true, assignedToId: { in: teamIds } },
            },
          },
        }),
      ]);

      rows.push({
        managerId: m.id,
        managerName: fullName(m.firstName, m.lastName),
        branchName: m.branch?.name ?? '—',
        teamSize: teamIds.length,
        calls,
        connected,
        connectRatePct: pct(connected, calls),
        interested,
        converted,
      });
    }

    return rows.sort((a, b) => b.converted - a.converted || b.calls - a.calls);
  }

  private async computePerTelecaller(
    organizationId: string,
    start: Date,
    end: Date,
    branchIds?: string[]
  ): Promise<TelecallerRow[]> {
    // Get all telecallers that made calls in the window; lighter than listing every active user.
    const usersWithCalls = await prisma.telecallerCall.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
        ...(branchIds ? { telecaller: { is: { branchId: { in: branchIds } } } } : {}),
      },
      distinct: ['telecallerId'],
      select: { telecallerId: true },
    });
    const userIds = usersWithCalls.map((u) => u.telecallerId);
    if (userIds.length === 0) return [];

    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        ...(branchIds ? { branchId: { in: branchIds } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        branch: { select: { name: true } },
        manager: { select: { firstName: true, lastName: true } },
      },
    });

    const rows: TelecallerRow[] = [];
    for (const u of users) {
      const [calls, connected, interested, converted] = await Promise.all([
        prisma.telecallerCall.count({
          where: { organizationId, telecallerId: u.id, createdAt: { gte: start, lte: end } },
        }),
        prisma.telecallerCall.count({
          where: {
            organizationId,
            telecallerId: u.id,
            status: 'COMPLETED',
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.telecallerCall.count({
          where: {
            organizationId,
            telecallerId: u.id,
            outcome: 'INTERESTED',
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.lead.count({
          where: {
            organizationId,
            isConverted: true,
            convertedAt: { gte: start, lte: end },
            assignments: { some: { isActive: true, assignedToId: u.id } },
          },
        }),
      ]);

      rows.push({
        userId: u.id,
        userName: fullName(u.firstName, u.lastName),
        managerName: u.manager
          ? fullName(u.manager.firstName, u.manager.lastName)
          : '—',
        branchName: u.branch?.name ?? '—',
        calls,
        connected,
        interested,
        converted,
      });
    }
    return rows;
  }

  private async computeConversions(
    organizationId: string,
    start: Date,
    end: Date,
    branchIds?: string[]
  ): Promise<ConversionRow[]> {
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        isConverted: true,
        convertedAt: { gte: start, lte: end },
        ...(branchIds ? { orgBranchId: { in: branchIds } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        source: true,
        actualValue: true,
        stage: { select: { name: true } },
        assignments: {
          where: { isActive: true },
          orderBy: { assignedAt: 'desc' },
          take: 1,
          select: {
            assignedTo: {
              select: {
                firstName: true,
                lastName: true,
                manager: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    return leads.map((l) => {
      const closer = l.assignments[0]?.assignedTo;
      return {
        leadId: l.id,
        leadName: fullName(l.firstName, l.lastName),
        phone: l.phone,
        source: String(l.source ?? '—'),
        stageName: l.stage?.name ?? '—',
        value: Number(l.actualValue ?? 0),
        closedByName: closer ? fullName(closer.firstName, closer.lastName) : 'Unassigned',
        managerName: closer?.manager
          ? fullName(closer.manager.firstName, closer.manager.lastName)
          : '—',
      };
    });
  }

  private async computeInterested(
    organizationId: string,
    start: Date,
    end: Date,
    branchIds?: string[]
  ): Promise<InterestedRow[]> {
    const calls = await prisma.telecallerCall.findMany({
      where: {
        organizationId,
        outcome: 'INTERESTED',
        createdAt: { gte: start, lte: end },
        ...(branchIds ? { telecaller: { is: { branchId: { in: branchIds } } } } : {}),
      },
      distinct: ['leadId'],
      select: {
        leadId: true,
        telecaller: {
          select: {
            firstName: true,
            lastName: true,
            manager: { select: { firstName: true, lastName: true } },
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            source: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const leadIds = calls.map((c) => c.leadId).filter((id): id is string => !!id);
    const nextFollowUps = leadIds.length
      ? await prisma.followUp.findMany({
          where: {
            leadId: { in: leadIds },
            status: 'UPCOMING',
            scheduledAt: { gte: new Date() },
          },
          orderBy: { scheduledAt: 'asc' },
          select: { leadId: true, scheduledAt: true },
        })
      : [];
    const nextByLead = new Map<string, Date>();
    for (const fu of nextFollowUps) {
      if (!nextByLead.has(fu.leadId)) nextByLead.set(fu.leadId, fu.scheduledAt);
    }

    return calls
      .filter((c) => c.lead)
      .map((c) => ({
        leadId: c.lead!.id,
        leadName: fullName(c.lead!.firstName, c.lead!.lastName),
        phone: c.lead!.phone,
        source: String(c.lead!.source ?? '—'),
        telecallerName: fullName(c.telecaller.firstName, c.telecaller.lastName),
        managerName: c.telecaller.manager
          ? fullName(c.telecaller.manager.firstName, c.telecaller.manager.lastName)
          : '—',
        nextFollowUpAt: nextByLead.get(c.lead!.id) ?? null,
      }));
  }

  // --------------------------------------------------------------------------
  // Recipient → scope resolver
  // --------------------------------------------------------------------------

  /**
   * Decide what slice of the org a given recipient should see in the digest.
   *
   *  - Admin-tier role (admin / super_admin / owner) → org-wide (no branch filter).
   *  - Email not matching any user in the org → org-wide (per product decision:
   *    treat external recipients like advisors and give them the full picture).
   *  - Otherwise → scope to the user's branch ∪ any branches they manage
   *    (User.managedBranches[] — regional managers). If that set is empty
   *    (manager with no branch), fall back to org-wide so the recipient still
   *    gets something useful.
   *
   * Tenant safety: the lookup is scoped by `organizationId`, so an email that
   * coincidentally matches a user in another org is treated as unknown here.
   */
  async resolveRecipientScope(
    organizationId: string,
    email: string
  ): Promise<{
    resolvedAs: 'admin' | 'branch' | 'unknown';
    branchIds?: string[];
    scopeLabel?: string;
  }> {
    const ADMIN_SLUGS = ['admin', 'super_admin', 'super-admin', 'owner'];

    const user = await prisma.user.findFirst({
      where: { organizationId, email, isActive: true },
      select: {
        role: { select: { slug: true } },
        branchId: true,
        branch: { select: { name: true } },
        managedBranches: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return { resolvedAs: 'unknown' };
    }

    if (user.role && ADMIN_SLUGS.includes(user.role.slug)) {
      return { resolvedAs: 'admin' };
    }

    const branchById = new Map<string, string>();
    if (user.branchId && user.branch) {
      branchById.set(user.branchId, user.branch.name);
    }
    for (const b of user.managedBranches) {
      branchById.set(b.id, b.name);
    }

    if (branchById.size === 0) {
      return { resolvedAs: 'admin' };
    }

    const branchIds = [...branchById.keys()];
    const names = [...branchById.values()];
    const scopeLabel =
      names.length === 1 ? `${names[0]} branch` : `${names.join(' + ')} branches`;

    return { resolvedAs: 'branch', branchIds, scopeLabel };
  }

  // --------------------------------------------------------------------------
  // HTML email body
  // --------------------------------------------------------------------------

  renderHtml(d: DigestData): string {
    const css = `
      body{font-family:Arial,sans-serif;color:#1f2937;line-height:1.5;margin:0;padding:0;background:#f3f4f6}
      .wrap{max-width:780px;margin:0 auto;padding:20px}
      .card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:16px}
      h1{font-size:20px;margin:0 0 4px}
      h2{font-size:16px;margin:0 0 12px;color:#111827}
      .muted{color:#6b7280;font-size:13px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:left}
      th{background:#f9fafb;font-weight:600;color:#374151}
      .n{text-align:right;font-variant-numeric:tabular-nums}
      .pos{color:#15803d}.neg{color:#b91c1c}.warn{color:#b45309}
      .pill{display:inline-block;padding:2px 8px;border-radius:999px;background:#dbeafe;color:#1e40af;font-size:11px;font-weight:600}
      .hd{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:18px;border-radius:8px 8px 0 0}
      .hd h1{color:#fff}
    `;
    const tot = d.totals;
    const prior = d.totalsPrior;

    const deltaCell = (today: number, prev: number, suffix = '') => {
      if (prev === 0 && today === 0) return '—';
      if (prev === 0) return `<span class="pos">new</span>`;
      const delta = ((today - prev) / prev) * 100;
      const sign = delta >= 0 ? '+' : '';
      const cls = delta > 0 ? 'pos' : delta < 0 ? 'neg' : '';
      return `<span class="${cls}">${sign}${delta.toFixed(1)}%${suffix}</span>`;
    };

    const ataglanceRows = [
      ['Total calls made', tot.totalCalls, prior.totalCalls],
      ['Calls connected', tot.callsConnected, prior.callsConnected],
      ['Connect rate', `${tot.connectRatePct.toFixed(1)}%`, `${prior.connectRatePct.toFixed(1)}%`],
      ['New leads', tot.newLeads, prior.newLeads],
      ['Marked Interested', tot.interested, prior.interested],
      ['Converted (Won)', tot.converted, prior.converted],
      ['Lost / Not Interested', tot.lostOrNotInterested, prior.lostOrNotInterested],
      ['Follow-ups completed', tot.followUpsCompleted, prior.followUpsCompleted],
      ['Overdue follow-ups (now)', tot.overdueFollowUps, prior.overdueFollowUps],
    ]
      .map(([label, today, prev]) => {
        const isHero = label === 'Converted (Won)';
        const todayStr = isHero ? `<b>${today}</b>` : `${today}`;
        const delta = typeof today === 'number' && typeof prev === 'number'
          ? deltaCell(today, prev)
          : '—';
        return `<tr><td>${label}</td><td class="n">${todayStr}</td><td class="n muted">${prev}</td><td class="n">${delta}</td></tr>`;
      })
      .join('');

    const managerRows = d.managerRows.length
      ? d.managerRows
          .map(
            (m) => `<tr>
            <td><b>${esc(m.managerName)}</b></td>
            <td>${esc(m.branchName)}</td>
            <td class="n">${m.teamSize}</td>
            <td class="n">${m.calls}</td>
            <td class="n">${m.connected}</td>
            <td class="n">${m.connectRatePct.toFixed(1)}%</td>
            <td class="n">${m.interested}</td>
            <td class="n"><b>${m.converted}</b></td>
          </tr>`
          )
          .join('')
      : `<tr><td colspan="8" class="muted">No managers with direct reports found.</td></tr>`;

    const topRows = d.topPerformers.length
      ? d.topPerformers
          .map(
            (t, i) => `<tr>
            <td class="n">${i + 1}</td>
            <td>${esc(t.userName)}</td>
            <td class="muted">${esc(t.managerName)}</td>
            <td class="n">${t.calls}</td>
            <td class="n">${t.connected}</td>
            <td class="n">${t.interested}</td>
            <td class="n"><b>${t.converted}</b></td>
          </tr>`
          )
          .join('')
      : `<tr><td colspan="7" class="muted">No calls in window.</td></tr>`;

    const bottomRows = d.bottomPerformers.length
      ? d.bottomPerformers
          .map(
            (t) => `<tr>
            <td>${esc(t.userName)}</td>
            <td class="muted">${esc(t.managerName)}</td>
            <td class="n">${t.calls}</td>
          </tr>`
          )
          .join('')
      : `<tr><td colspan="3" class="muted">No telecallers under threshold.</td></tr>`;

    const conversionRows = d.conversions.length
      ? d.conversions
          .map(
            (c) => `<tr>
            <td>${esc(c.leadName)}</td>
            <td class="muted">${esc(c.phone)}</td>
            <td>${esc(c.source)}</td>
            <td>${esc(c.stageName)}</td>
            <td class="n">${formatINR(c.value)}</td>
            <td>${esc(c.closedByName)}</td>
            <td class="muted">${esc(c.managerName)}</td>
          </tr>`
          )
          .join('')
      : `<tr><td colspan="7" class="muted">No conversions today.</td></tr>`;

    const interestedRows = d.interestedLeads.slice(0, 10).length
      ? d.interestedLeads
          .slice(0, 10)
          .map(
            (l) => `<tr>
            <td>${esc(l.leadName)}</td>
            <td class="muted">${esc(l.phone)}</td>
            <td>${esc(l.source)}</td>
            <td>${esc(l.telecallerName)}</td>
            <td class="muted">${esc(l.managerName)}</td>
            <td>${l.nextFollowUpAt ? formatDateTime(l.nextFollowUpAt) : '<span class="muted">—</span>'}</td>
          </tr>`
          )
          .join('') +
        (d.interestedLeads.length > 10
          ? `<tr><td colspan="6" class="muted">…${d.interestedLeads.length - 10} more — see attached spreadsheet.</td></tr>`
          : '')
      : `<tr><td colspan="6" class="muted">No interested leads today.</td></tr>`;

    return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
      <div class="wrap">
        <div class="hd">
          <h1>📊 Daily Activity Report — ${esc(d.organizationName)}</h1>
          <div style="font-size:13px;opacity:.9">${esc(d.reportDateLabel)}${d.scopeLabel ? ` · <b>${esc(d.scopeLabel)}</b>` : ''}</div>
        </div>

        <div class="card">
          <h2>At a glance</h2>
          <table>
            <thead><tr><th>Metric</th><th class="n">Today</th><th class="n">Yesterday</th><th class="n">Δ</th></tr></thead>
            <tbody>${ataglanceRows}</tbody>
          </table>
        </div>

        <div class="card">
          <h2>Performance by manager</h2>
          <table>
            <thead><tr>
              <th>Manager</th><th>Branch</th><th class="n">Team size</th>
              <th class="n">Calls</th><th class="n">Connected</th><th class="n">Conn %</th>
              <th class="n">Interested</th><th class="n">Converted</th>
            </tr></thead>
            <tbody>${managerRows}</tbody>
          </table>
        </div>

        <div class="card">
          <h2>Top performers</h2>
          <table>
            <thead><tr>
              <th class="n">#</th><th>Telecaller</th><th>Manager</th>
              <th class="n">Calls</th><th class="n">Connected</th>
              <th class="n">Interested</th><th class="n">Converted</th>
            </tr></thead>
            <tbody>${topRows}</tbody>
          </table>
          <h2 style="margin-top:20px">Bottom (calls &lt; 10)</h2>
          <table>
            <thead><tr><th>Telecaller</th><th>Manager</th><th class="n">Calls</th></tr></thead>
            <tbody>${bottomRows}</tbody>
          </table>
        </div>

        <div class="card">
          <h2>🎉 Conversions (${d.conversions.length})</h2>
          <table>
            <thead><tr>
              <th>Lead</th><th>Phone</th><th>Source</th><th>Stage</th>
              <th class="n">Value</th><th>Closed by</th><th>Manager</th>
            </tr></thead>
            <tbody>${conversionRows}</tbody>
          </table>
          <div class="muted" style="margin-top:8px">Total revenue added: <b>${formatINR(d.revenueAdded)}</b></div>
        </div>

        <div class="card">
          <h2>🔥 Interested leads (${d.interestedLeads.length})</h2>
          <table>
            <thead><tr>
              <th>Lead</th><th>Phone</th><th>Source</th>
              <th>Telecaller</th><th>Manager</th><th>Next follow-up</th>
            </tr></thead>
            <tbody>${interestedRows}</tbody>
          </table>
        </div>

        ${tot.overdueFollowUps > 0
          ? `<div class="card" style="border-color:#fde68a;background:#fffbeb">
               <h2 class="warn">⚠️ Needs attention</h2>
               <div><b>${tot.overdueFollowUps}</b> follow-ups are currently overdue (past their scheduled time).</div>
             </div>`
          : ''}

        <div class="muted" style="text-align:center;padding:10px 0">
          Automated report from MyLeadX · Settings → Automatic Reports
        </div>
      </div>
    </body></html>`;
  }

  // --------------------------------------------------------------------------
  // Excel attachment
  // --------------------------------------------------------------------------

  async generateExcel(
    d: DigestData
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'MyLeadX';
    wb.created = d.generatedAt;

    // Sheet 1: Summary
    const s1 = wb.addWorksheet('Summary');
    s1.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Today', key: 'today', width: 14 },
      { header: 'Yesterday', key: 'prior', width: 14 },
    ];
    const t = d.totals;
    const p = d.totalsPrior;
    [
      ['Report date', d.reportDateLabel, ''],
      ['Total calls made', t.totalCalls, p.totalCalls],
      ['Calls connected', t.callsConnected, p.callsConnected],
      ['Connect rate %', t.connectRatePct.toFixed(1), p.connectRatePct.toFixed(1)],
      ['New leads', t.newLeads, p.newLeads],
      ['Marked Interested', t.interested, p.interested],
      ['Converted (Won)', t.converted, p.converted],
      ['Lost / Not Interested', t.lostOrNotInterested, p.lostOrNotInterested],
      ['Follow-ups completed', t.followUpsCompleted, p.followUpsCompleted],
      ['Overdue follow-ups (now)', t.overdueFollowUps, p.overdueFollowUps],
      ['Revenue added (today)', d.revenueAdded, ''],
    ].forEach((row) => s1.addRow({ metric: row[0], today: row[1], prior: row[2] }));
    s1.getRow(1).font = { bold: true };

    // Sheet 2: Per manager
    const s2 = wb.addWorksheet('By manager');
    s2.columns = [
      { header: 'Manager', key: 'managerName', width: 24 },
      { header: 'Branch', key: 'branchName', width: 22 },
      { header: 'Team size', key: 'teamSize', width: 11 },
      { header: 'Calls', key: 'calls', width: 9 },
      { header: 'Connected', key: 'connected', width: 11 },
      { header: 'Conn %', key: 'connectRatePct', width: 9 },
      { header: 'Interested', key: 'interested', width: 11 },
      { header: 'Converted', key: 'converted', width: 11 },
    ];
    d.managerRows.forEach((m) => s2.addRow(m));
    s2.getRow(1).font = { bold: true };

    // Sheet 3: Per telecaller (top + bottom merged into "all who called")
    const s3 = wb.addWorksheet('By telecaller');
    s3.columns = [
      { header: 'Telecaller', key: 'userName', width: 24 },
      { header: 'Manager', key: 'managerName', width: 22 },
      { header: 'Branch', key: 'branchName', width: 22 },
      { header: 'Calls', key: 'calls', width: 9 },
      { header: 'Connected', key: 'connected', width: 11 },
      { header: 'Interested', key: 'interested', width: 11 },
      { header: 'Converted', key: 'converted', width: 11 },
    ];
    [...d.topPerformers, ...d.bottomPerformers].forEach((r) => s3.addRow(r));
    s3.getRow(1).font = { bold: true };

    // Sheet 4: Conversions detail
    const s4 = wb.addWorksheet('Conversions');
    s4.columns = [
      { header: 'Lead', key: 'leadName', width: 24 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Source', key: 'source', width: 14 },
      { header: 'Stage', key: 'stageName', width: 14 },
      { header: 'Value (INR)', key: 'value', width: 14 },
      { header: 'Closed by', key: 'closedByName', width: 22 },
      { header: 'Manager', key: 'managerName', width: 22 },
    ];
    d.conversions.forEach((c) => s4.addRow(c));
    s4.getRow(1).font = { bold: true };

    // Sheet 5: Interested leads detail
    const s5 = wb.addWorksheet('Interested leads');
    s5.columns = [
      { header: 'Lead', key: 'leadName', width: 24 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Source', key: 'source', width: 14 },
      { header: 'Telecaller', key: 'telecallerName', width: 22 },
      { header: 'Manager', key: 'managerName', width: 22 },
      { header: 'Next follow-up', key: 'nextFollowUpAt', width: 22 },
    ];
    d.interestedLeads.forEach((l) =>
      s5.addRow({
        ...l,
        nextFollowUpAt: l.nextFollowUpAt ? formatDateTime(l.nextFollowUpAt) : '',
      })
    );
    s5.getRow(1).font = { bold: true };

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const dateSlug = d.reportDate.toISOString().slice(0, 10);
    return {
      buffer,
      filename: `daily-manager-digest-${dateSlug}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}

export const dailyManagerDigestService = new DailyManagerDigestService();

// ============================================================================
// Helpers
// ============================================================================

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function yesterday(): Date {
  return addDays(new Date(), -1);
}

function fullName(first: string | null | undefined, last: string | null | undefined): string {
  return [first, last].filter(Boolean).join(' ').trim() || 'Unknown';
}

function pct(num: number, den: number): number {
  if (!den) return 0;
  return (num / den) * 100;
}

function formatINR(value: number): string {
  if (!value) return '₹0';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
