import assert from "node:assert/strict";
import test from "node:test";
import { OrderItemStatus, OrderStatus } from "@/generated/prisma/enums";
import {
  canConfirmBuyerReceipt,
  canMarkFulfillmentDelivered,
  canStartFulfillment,
} from "@/lib/order-transitions";

test("fulfillment starts only for pending items in payable orders without disputes", () => {
  assert.equal(
    canStartFulfillment({
      itemStatus: OrderItemStatus.PENDING,
      orderStatus: OrderStatus.PAID,
      hasActiveDispute: false,
    }),
    true
  );
  assert.equal(
    canStartFulfillment({
      itemStatus: OrderItemStatus.DELIVERED,
      orderStatus: OrderStatus.PAID,
      hasActiveDispute: false,
    }),
    false
  );
  assert.equal(
    canStartFulfillment({
      itemStatus: OrderItemStatus.PENDING,
      orderStatus: OrderStatus.CANCELLED,
      hasActiveDispute: false,
    }),
    false
  );
  assert.equal(
    canStartFulfillment({
      itemStatus: OrderItemStatus.PENDING,
      orderStatus: OrderStatus.PAID,
      hasActiveDispute: true,
    }),
    false
  );
});

test("delivery and receipt confirmation require their exact preceding states", () => {
  const validOrder = OrderStatus.PROCESSING;
  assert.equal(
    canMarkFulfillmentDelivered({
      itemStatus: OrderItemStatus.PROCESSING,
      orderStatus: validOrder,
      hasActiveDispute: false,
    }),
    true
  );
  assert.equal(
    canMarkFulfillmentDelivered({
      itemStatus: OrderItemStatus.PENDING,
      orderStatus: validOrder,
      hasActiveDispute: false,
    }),
    false
  );
  assert.equal(
    canConfirmBuyerReceipt({
      itemStatus: OrderItemStatus.DELIVERED,
      orderStatus: validOrder,
      hasActiveDispute: false,
    }),
    true
  );
  assert.equal(
    canConfirmBuyerReceipt({
      itemStatus: OrderItemStatus.DELIVERED,
      orderStatus: validOrder,
      hasActiveDispute: true,
    }),
    false
  );
});
