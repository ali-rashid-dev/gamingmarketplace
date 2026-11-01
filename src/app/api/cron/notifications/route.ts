import { timingSafeEqual } from "node:crypto";
import { deliverNotificationOutboxBatch } from "@/lib/notification-outbox";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "Notification worker is not configured" }, { status: 503 });
  }
  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const providedBuffer = Buffer.from(authorization);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(await deliverNotificationOutboxBatch());
}
