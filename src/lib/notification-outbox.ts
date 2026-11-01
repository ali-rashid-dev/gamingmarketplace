import { NotificationChannel, type NotificationType } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { Resend } from "resend";

type NotificationTransaction = Prisma.TransactionClient;

export async function enqueueUserNotification(
  transaction: NotificationTransaction,
  input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    eventKey: string;
    data?: Prisma.InputJsonValue;
  }
) {
  const idempotencyKey = `${input.eventKey}:${input.userId}`;
  const notification = await transaction.notification.upsert({
    where: { idempotencyKey },
    create: {
      userId: input.userId,
      type: input.type,
      channel: NotificationChannel.IN_APP,
      title: input.title,
      body: input.body,
      data: input.data,
      idempotencyKey,
    },
    update: {},
    select: { id: true },
  });
  await transaction.notificationOutbox.upsert({
    where: { dedupeKey: idempotencyKey },
    create: {
      userId: input.userId,
      notificationId: notification.id,
      dedupeKey: idempotencyKey,
    },
    update: {},
  });
  return notification;
}

const maxAttempts = 8;
const batchSize = 20;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(apiKey);
}

export async function deliverNotificationOutboxBatch() {
  const outboxIds = await prisma.$transaction(async (transaction) => {
    await transaction.notificationOutbox.updateMany({
      where: {
        status: "PROCESSING",
        attempts: { gte: maxAttempts },
        lockedAt: { lt: new Date(Date.now() - 5 * 60_000) },
      },
      data: { status: "DEAD", lockedAt: null },
    });
    return transaction.$queryRaw<{ id: string }[]>`
        WITH candidates AS (
          SELECT "id"
          FROM "NotificationOutbox"
          WHERE "attempts" < ${maxAttempts}
            AND (
              ("status" = 'PENDING' AND "availableAt" <= NOW())
              OR ("status" = 'PROCESSING' AND "lockedAt" < NOW() - INTERVAL '5 minutes')
            )
          ORDER BY "availableAt", "createdAt"
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE "NotificationOutbox" AS outbox
        SET "status" = 'PROCESSING',
            "attempts" = outbox."attempts" + 1,
            "lockedAt" = NOW(),
            "updatedAt" = NOW()
        FROM candidates
        WHERE outbox."id" = candidates."id"
        RETURNING outbox."id"
      `;
  });
  const result = { claimed: outboxIds.length, sent: 0, skipped: 0, retried: 0, dead: 0 };

  for (const { id } of outboxIds) {
    const job = await prisma.notificationOutbox.findUnique({
      where: { id },
      include: {
        notification: { select: { title: true, body: true, data: true } },
        user: {
          select: {
            email: true,
            profile: { select: { emailNotifications: true } },
          },
        },
      },
    });
    if (!job) continue;

    if (job.user.profile?.emailNotifications === false) {
      await prisma.notificationOutbox.updateMany({
        where: { id, status: "PROCESSING" },
        data: { status: "SKIPPED", lockedAt: null, lastError: null },
      });
      result.skipped += 1;
      continue;
    }

    try {
      const sender = process.env.RESEND_FROM_EMAIL;
      if (!sender) throw new Error("RESEND_FROM_EMAIL is not configured");
      const baseUrl = process.env.BETTER_AUTH_URL;
      if (!baseUrl) throw new Error("BETTER_AUTH_URL is not configured");
      const notificationData = job.notification.data;
      const workspace = notificationData && typeof notificationData === "object" &&
        !Array.isArray(notificationData) && "recipientWorkspace" in notificationData
        ? notificationData.recipientWorkspace
        : null;
      const notificationsPath = workspace === "SUPPORT"
        ? "/support/console/notifications"
        : workspace === "SELLER"
          ? "/seller/notifications"
          : "/dashboard/notifications";
      const response = await getResend().emails.send(
        {
          from: sender,
          to: job.user.email,
          subject: job.notification.title,
          text: `${job.notification.title}\n\n${job.notification.body}\n\nView your notifications: ${baseUrl.replace(/\/+$/, "")}${notificationsPath}`,
        },
        { idempotencyKey: `notification-outbox-${job.id}` }
      );
      if (response.error) throw new Error(response.error.message);
      await prisma.$transaction([
        prisma.notificationOutbox.updateMany({
          where: { id, status: "PROCESSING" },
          data: { status: "SENT", sentAt: new Date(), lockedAt: null, lastError: null },
        }),
        prisma.notification.updateMany({
          where: { id: job.notificationId, sentAt: null },
          data: { sentAt: new Date() },
        }),
      ]);
      result.sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email delivery failed";
      const dead = job.attempts >= maxAttempts;
      const delayMs = Math.min(60_000 * 2 ** (job.attempts - 1), 6 * 60 * 60 * 1000);
      await prisma.notificationOutbox.updateMany({
        where: { id, status: "PROCESSING" },
        data: {
          status: dead ? "DEAD" : "PENDING",
          availableAt: dead ? job.availableAt : new Date(Date.now() + delayMs),
          lockedAt: null,
          lastError: message.slice(0, 1000),
        },
      });
      console.error(`Notification email delivery failed for outbox item ${id}`, error);
      if (dead) result.dead += 1;
      else result.retried += 1;
    }
  }

  return result;
}
