"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type OrderStatusProps = {
  orderId: string;
  initialStatus: string;
};

export function OrderStatus({ orderId, initialStatus }: OrderStatusProps) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`customer-order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, (payload) => {
        if (typeof payload.new.status === "string") {
          setStatus(payload.new.status);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  return <span className="font-medium capitalize">{status.replaceAll("_", " ")}</span>;
}
