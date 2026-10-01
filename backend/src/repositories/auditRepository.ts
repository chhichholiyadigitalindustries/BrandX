import { prisma } from '../config/database.js';
import { AuditLog, ActorType, Prisma } from '@prisma/client';
import crypto from 'crypto';

export class AuditRepository {
  async log(params: {
    actorId?: string;
    actorType?: ActorType;
    action: string;
    entity: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLog> {
    try {
      return await prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          actorType: params.actorType || 'USER',
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: (params.metadata as Prisma.InputJsonValue) || undefined,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2022' || err?.message?.includes('metadata')) {
        const id = crypto.randomUUID();
        const detailsJson = params.metadata ? JSON.stringify(params.metadata) : null;
        try {
          const actorId = params.actorId || 'SYSTEM';
          await prisma.$executeRawUnsafe(
            `INSERT INTO "AuditLog" ("id", "actorId", "actorType", "action", "entity", "entityId", "ipAddress", "userAgent", "details", "createdAt")
             VALUES ($1, $2, CAST($3::text AS "ActorType"), $4, $5, $6, $7, $8, CASE WHEN $9::text IS NULL THEN NULL ELSE ($9::text)::jsonb END, NOW())`,
            id,
            actorId,
            params.actorType || 'USER',
            params.action,
            params.entity,
            params.entityId || null,
            params.ipAddress || null,
            params.userAgent || null,
            detailsJson
          );
        } catch (execErr: any) {
          console.warn('[AuditLog Fallback Error]:', execErr?.message || execErr);
        }
        return {
          id,
          actorId: params.actorId || null,
          actorType: params.actorType || 'USER',
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          metadata: (params.metadata as Prisma.JsonValue) || null,
          createdAt: new Date(),
        } as AuditLog;
      }
      throw err;
    }
  }

  async list(limit = 100): Promise<AuditLog[]> {
    try {
      return await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (err: any) {
      if (err?.code === 'P2022') {
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT "id", "actorId", "actorType", "action", "entity", "entityId", "ipAddress", "userAgent", "details" as metadata, "createdAt"
           FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT $1`,
          limit
        );
        return rows as AuditLog[];
      }
      throw err;
    }
  }
}

export const auditRepository = new AuditRepository();
