export const BUYER_PROTECTION_DELIVERY_WINDOW_DAYS = 7;
export const BUYER_PROTECTION_NON_DELIVERY_WINDOW_DAYS = 30;
export const BUYER_PROTECTION_APPEAL_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export function getBuyerProtectionDeadline(input: {
  placedAt: Date;
  deliveredAt: Date | null;
}) {
  return new Date(
    (input.deliveredAt ?? input.placedAt).getTime() +
      (input.deliveredAt
        ? BUYER_PROTECTION_DELIVERY_WINDOW_DAYS
        : BUYER_PROTECTION_NON_DELIVERY_WINDOW_DAYS) *
        DAY_MS
  );
}

export function isBuyerProtectionOpen(input: {
  placedAt: Date;
  deliveredAt: Date | null;
  now?: Date;
}) {
  return getBuyerProtectionDeadline(input).getTime() >=
    (input.now ?? new Date()).getTime();
}

export function getDisputeAppealDeadline(resolvedAt: Date) {
  return new Date(
    resolvedAt.getTime() + BUYER_PROTECTION_APPEAL_WINDOW_DAYS * DAY_MS
  );
}
