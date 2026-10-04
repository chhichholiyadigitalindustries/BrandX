import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { sendError } from '../utils/response.js';

export async function requireBusinessAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = req.user;
  if (!user) {
    sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    return;
  }

  // Business ID can come from headers, params, query or body
  const businessId =
    (req.headers['x-business-id'] as string) ||
    req.params.businessId ||
    (req.query.businessId as string) ||
    req.body.businessId;

  if (!businessId) {
    // If no explicit businessId is provided, try to find user's primary/first business
    const firstBusiness = await prisma.business.findFirst({
      where: { ownerId: user.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!firstBusiness) {
      sendError(res, 'No active business profile found for this user', 404, 'BUSINESS_NOT_FOUND');
      return;
    }

    req.businessId = firstBusiness.id;
    next();
    return;
  }

  // Validate ownership
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true, status: true },
  });

  if (!business || business.ownerId !== user.id) {
    sendError(res, 'You do not have permission to access this business data', 403, 'ACCESS_DENIED');
    return;
  }

  if (business.status === 'SUSPENDED') {
    sendError(res, 'This business profile is suspended', 403, 'BUSINESS_SUSPENDED');
    return;
  }

  req.businessId = business.id;
  next();
}

export async function optionalBusinessAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = req.user;
  if (!user) {
    next();
    return;
  }

  const businessId =
    (req.headers['x-business-id'] as string) ||
    req.params.businessId ||
    (req.query.businessId as string) ||
    req.body?.businessId;

  if (businessId) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true, status: true },
    });
    if (business && business.ownerId === user.id && business.status !== 'SUSPENDED') {
      req.businessId = business.id;
    }
  } else {
    const firstBusiness = await prisma.business.findFirst({
      where: { ownerId: user.id, status: 'ACTIVE' },
      select: { id: true },
    });
    if (firstBusiness) {
      req.businessId = firstBusiness.id;
    }
  }
  next();
}

