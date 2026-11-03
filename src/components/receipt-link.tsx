import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReceiptLink({ orderId }: { orderId: string }) {
  return <Button size="sm" variant="outline" render={<Link href={`/orders/${orderId}/receipt`} />}><Printer aria-hidden="true" className="size-4" />View / Print receipt</Button>;
}
