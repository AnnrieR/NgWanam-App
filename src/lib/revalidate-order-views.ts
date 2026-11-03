import "server-only";
import { revalidatePath } from "next/cache";

/** Order, delivery, and inventory screens share the same workflow state. */
export function revalidateOrderViews(orderId: string) {
  for (const path of ["/staff", "/admin", "/staff/orders", "/admin/orders", "/staff/delivery", "/admin/delivery", "/delivery/orders", "/staff/inventory", "/admin/inventory", "/staff/payments", "/admin/payments", "/admin/reports", "/orders", "/home", "/cart", "/checkout"]) revalidatePath(path);
  revalidatePath(`/orders/${orderId}`);
}
