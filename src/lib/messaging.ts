import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

export const MAX_MESSAGE_ATTACHMENTS = 4;
export const MAX_MESSAGE_ATTACHMENT_SIZE = 5 * 1024 * 1024;
export const MESSAGE_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const messageAttachmentSchema = z.object({
  url: z.string().url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.port &&
      ["ufs.sh", "utfs.io"].some((host) =>
        url.hostname === host || url.hostname.endsWith(`.${host}`)
      );
  }, "Attachments must be hosted securely on UploadThing"),
  name: z.string().trim().min(1).max(180),
  size: z.number().int().min(1).max(MAX_MESSAGE_ATTACHMENT_SIZE),
  contentType: z.enum(MESSAGE_ATTACHMENT_TYPES),
}).strict();

export const messageAttachmentsSchema = z
  .array(messageAttachmentSchema)
  .max(MAX_MESSAGE_ATTACHMENTS);

export type MessageAttachment = z.infer<typeof messageAttachmentSchema>;

export const messageCredentialPattern =
  /(?:password|passcode|recovery\s+code|backup\s+code|login\s+credentials?)\s*[:=]\s*\S+/i;

export async function enforceMessageRateLimit(
  transaction: Prisma.TransactionClient,
  userId: string
) {
  await transaction.$queryRaw`
    SELECT pg_advisory_xact_lock(
      hashtext('gamingmarketplace:messages'),
      hashtext(${userId})
    )
  `;
  const recentMessages = await transaction.message.count({
    where: {
      senderId: userId,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  return recentMessages < 10;
}

export function isMessageAttachment(value: unknown): value is MessageAttachment {
  return messageAttachmentSchema.safeParse(value).success;
}
