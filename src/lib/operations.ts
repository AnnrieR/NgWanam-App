export function manilaDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export type OperationStatus = { status: string; orderType?: string | null; deliveryStatus?: string | null };

export function operationLabel(order: OperationStatus, rider = false) {
  if (order.status === "cancelled") return "Cancelled";
  if (rider && order.status === "ready" && order.deliveryStatus === "assigned") return "Assigned · Awaiting pick-up";
  if (rider && order.deliveryStatus === "delivered") return order.status === "completed" ? "Delivered · Order completed" : "Delivered · Awaiting completion";
  if (order.status === "completed") return "Completed";
  if (order.status === "ready") {
    if (order.orderType === "pickup") return "Ready for Pick-up";
    if (order.deliveryStatus === "out_for_delivery") return "Out for Delivery";
    if (order.deliveryStatus === "delivered") return "Delivered · Awaiting completion";
    if (order.deliveryStatus === "assigned") return "Ready · Rider assigned";
    return "Ready · Awaiting rider";
  }
  return { pending: "Pending", confirmed: "Confirmed", preparing: "Preparing" }[order.status] ?? order.status;
}

export function inOperationTab(order: OperationStatus, tab: string) {
  if (tab === "cancelled") return order.status === "cancelled";
  if (order.status === "cancelled") return false;
  if (tab === "all") return true;
  if (tab === "new") return ["pending", "confirmed"].includes(order.status);
  if (tab === "preparing") return order.status === "preparing";
  if (tab === "completed") return order.status === "completed";
  if (tab === "assigned") return order.status === "ready" && order.deliveryStatus === "assigned";
  if (tab === "out-for-delivery") return order.status === "ready" && order.deliveryStatus === "out_for_delivery";
  if (tab === "delivered") return order.status === "ready" && order.deliveryStatus === "delivered";
  if (tab === "rider-delivered") return order.deliveryStatus === "delivered";
  return order.status === "ready" && !["out_for_delivery", "delivered"].includes(order.deliveryStatus ?? "");
}
