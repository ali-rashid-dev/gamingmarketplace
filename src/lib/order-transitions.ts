import { OrderItemStatus, OrderStatus } from "@/generated/prisma/enums";

const fulfillmentOrderStatuses: OrderStatus[] = [OrderStatus.PAID, OrderStatus.PROCESSING];

export function canStartFulfillment(input: {
  itemStatus: OrderItemStatus;
  orderStatus: OrderStatus;
  hasActiveDispute: boolean;
}) {
  return input.itemStatus === OrderItemStatus.PENDING &&
    fulfillmentOrderStatuses.includes(input.orderStatus) &&
    !input.hasActiveDispute;
}

export function canMarkFulfillmentDelivered(input: {
  itemStatus: OrderItemStatus;
  orderStatus: OrderStatus;
  hasActiveDispute: boolean;
}) {
  return input.itemStatus === OrderItemStatus.PROCESSING &&
    fulfillmentOrderStatuses.includes(input.orderStatus) &&
    !input.hasActiveDispute;
}

export function canConfirmBuyerReceipt(input: {
  itemStatus: OrderItemStatus;
  orderStatus: OrderStatus;
  hasActiveDispute: boolean;
}) {
  return input.itemStatus === OrderItemStatus.DELIVERED &&
    fulfillmentOrderStatuses.includes(input.orderStatus) &&
    !input.hasActiveDispute;
}
