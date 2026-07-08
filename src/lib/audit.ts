import { prisma } from "@/lib/prisma";
import type { AdminSession } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export async function createAuditLog(params: {
  admin: AdminSession;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      adminId: params.admin.id,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata ?? undefined,
    },
  });
}
