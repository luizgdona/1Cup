import type { ReportEntity } from '@prisma/client';
import { prisma } from '../../config/database';
import type { CreateReportInput, ListReportsQuery, ReviewReportInput } from './reports.schema';

/** Confirms the reported entity actually exists before storing a report. */
async function assertEntityExists(entityType: ReportEntity, entityId: string) {
  const exists =
    entityType === 'CHECKIN' ? await prisma.checkIn.findUnique({ where: { id: entityId }, select: { id: true } }) :
    entityType === 'COMMENT' ? await prisma.comment.findUnique({ where: { id: entityId }, select: { id: true } }) :
    await prisma.user.findUnique({ where: { id: entityId }, select: { id: true } });
  if (!exists) throw { statusCode: 404, message: 'Conteúdo denunciado não encontrado.' };
}

export async function createReport(reporterId: string, input: CreateReportInput) {
  await assertEntityExists(input.entityType, input.entityId);

  if (input.entityType === 'USER' && input.entityId === reporterId) {
    throw { statusCode: 400, message: 'Você não pode denunciar a si mesmo.' };
  }

  // Collapse duplicate open reports from the same user on the same entity.
  const existing = await prisma.report.findFirst({
    where: { reporterId, entityType: input.entityType, entityId: input.entityId, status: 'PENDING' },
    select: { id: true },
  });
  if (existing) {
    return { id: existing.id, deduped: true };
  }

  const report = await prisma.report.create({
    data: {
      reporterId,
      entityType: input.entityType,
      entityId: input.entityId,
      reason: input.reason,
      note: input.note,
    },
    select: { id: true, status: true, createdAt: true },
  });
  return { ...report, deduped: false };
}

export async function listReports(query: ListReportsQuery) {
  const { status, page, perPage } = query;
  const where = { status };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        reporter: { select: { id: true, username: true, displayName: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return { reports, total };
}

export async function reviewReport(id: string, adminId: string, input: ReviewReportInput) {
  const report = await prisma.report.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!report) throw { statusCode: 404, message: 'Denúncia não encontrada.' };
  if (report.status !== 'PENDING') throw { statusCode: 409, message: 'Denúncia já revisada.' };

  return prisma.report.update({
    where: { id },
    data: {
      status: input.action === 'review' ? 'REVIEWED' : 'DISMISSED',
      reviewedBy: adminId,
      reviewNote: input.reviewNote,
    },
    select: { id: true, status: true, reviewNote: true },
  });
}
