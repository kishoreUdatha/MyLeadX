/**
 * Super Admin Auth Middleware
 *
 * Accepts BOTH:
 *   1. Dedicated super admin tokens (decoded.isSuperAdmin === true) from
 *      the SuperAdmin table login flow
 *   2. Tenant user tokens whose roleSlug is super-admin / platform-admin
 *
 * Sets req.user with a uniform shape so downstream controllers can use
 * req.user.id whether the actor is a SuperAdmin or a tenant user.
 *
 * For SuperAdmin tokens, we look up a corresponding tenant User by email
 * (typically in the SMARTGROW INFOTECH org) so foreign-key references
 * like ProspectActivity.userId resolve to a real users row. If none
 * exists, the request proceeds with req.superAdmin populated but req.user
 * unset — read-only endpoints work, write endpoints must guard.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { getAccessToken } from '../utils/cookies';

const SUPER_ADMIN_ROLE_SLUGS = [
  'super-admin',
  'super_admin',
  'platform-admin',
  'superadmin',
  'platform_admin',
];

export interface SuperAdminRequest extends Request {
  superAdmin?: {
    id: string;
    email: string;
    isSuperAdmin: true;
  };
  user?: {
    id: string;
    organizationId: string;
    email: string;
    firstName: string;
    lastName: string;
    roleSlug: string;
  };
}

export async function verifySuperAdmin(
  req: SuperAdminRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let token = getAccessToken(req);
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as Record<string, unknown>;

    // Method 1: dedicated super admin token
    if (decoded.isSuperAdmin) {
      const superAdminId = decoded.id as string;
      const email = decoded.email as string;
      req.superAdmin = { id: superAdminId, email, isSuperAdmin: true };

      // Try to find a matching tenant user so write-side actions get a valid FK
      const matchingUser = await prisma.user.findFirst({
        where: { email },
        include: { role: true },
      });
      if (matchingUser) {
        req.user = {
          id: matchingUser.id,
          organizationId: matchingUser.organizationId,
          email: matchingUser.email,
          firstName: matchingUser.firstName,
          lastName: matchingUser.lastName,
          roleSlug: matchingUser.role.slug,
        };
      }
      next();
      return;
    }

    // Method 2: tenant user with super-admin role
    const userId = decoded.userId as string | undefined;
    const roleSlug = decoded.roleSlug as string | undefined;

    if (userId && roleSlug && SUPER_ADMIN_ROLE_SLUGS.includes(roleSlug.toLowerCase())) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
      if (user) {
        req.user = {
          id: user.id,
          organizationId: user.organizationId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleSlug: user.role.slug,
        };
        req.superAdmin = {
          id: user.id,
          email: user.email,
          isSuperAdmin: true,
        };
        next();
        return;
      }
    }

    res.status(403).json({ success: false, message: 'Not authorized as super admin' });
  } catch (_error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}
