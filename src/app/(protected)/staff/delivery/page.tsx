import { requireRole } from "@/lib/auth";
import { one } from "@/lib/embedded";
import { createClient } from "@/lib/supabase/server";
import { DeliveryMonitoring, type DeliveryRow } from "@/components/delivery-monitoring";

async function collect<T>(query: (start: number,end: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for(let start=0; ;start+=500) {
    const { data,error } = await query(start,start+499);
    if(error) return { data: [] as T[], failed: true };
    rows.push(...data ?? []);
    if(!data || data.length<500) return { data: rows, failed: false };
  }
}

export default async function StaffDeliveryPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; error?: string; updated?: string }> }) {
  const { profile } = await requireRole(["staff","admin"]);
  const { q="",status="",error,updated } = await searchParams;
  const supabase = await createClient();
  const [readyResult,deliveryResult,riderResult,ratingResult] = await Promise.all([
    collect((start,end) => supabase.from("orders").select("id, order_number, contact_name, contact_phone, delivery_address, status").eq("order_type","delivery").eq("status","ready").order("created_at").order("id").range(start,end)),
    collect((start,end) => supabase.from("deliveries").select("id, order_id, assigned_to, status, assigned_at, out_for_delivery_at, delivered_at, profiles(full_name, phone), orders(id, order_number, contact_name, contact_phone, delivery_address, status)").order("created_at",{ascending:false}).order("id").range(start,end)),
    collect((start,end) => supabase.from("profiles").select("id,full_name").eq("role","delivery").eq("is_active",true).order("full_name").order("id").range(start,end)),
    supabase.rpc("get_rider_rating_summaries"),
  ]);
  const failed = readyResult.failed || deliveryResult.failed || riderResult.failed;
  const summaries = (ratingResult.data ?? []) as { rider_id: string; average_rating: number; rating_count: number }[];
  const ratings = new Map(summaries.map(row => [row.rider_id,{average:Number(row.average_rating),count:Number(row.rating_count)}]));
  const assigned = new Set(deliveryResult.data.map(row => row.order_id));
  const rows: DeliveryRow[] = readyResult.data.filter(order => !assigned.has(order.id)).map(order => ({
    id:order.id,orderId:order.id,number:order.order_number,customer:order.contact_name,phone:order.contact_phone,address:order.delivery_address ?? "",orderStatus:order.status,
    status:"awaiting_assignment",riderId:null,rider:null,riderPhone:null,assignedAt:null,outAt:null,deliveredAt:null,average:null,ratingCount:0,
  }));
  for(const delivery of deliveryResult.data) {
    const order = one(delivery.orders), rider=one(delivery.profiles);
    if(!order) continue;
    const summary = ratings.get(delivery.assigned_to);
    rows.push({id:delivery.id,orderId:order.id,number:order.order_number,customer:order.contact_name,phone:order.contact_phone,address:order.delivery_address ?? "",orderStatus:order.status,
      status:delivery.status,riderId:delivery.assigned_to,rider:rider?.full_name ?? null,riderPhone:rider?.phone ?? null,assignedAt:delivery.assigned_at,outAt:delivery.out_for_delivery_at,deliveredAt:delivery.delivered_at,average:summary?.average ?? null,ratingCount:summary?.count ?? 0});
  }
  const riders = riderResult.data.map(rider => ({id:rider.id,name:rider.full_name ?? "Rider",average:ratings.get(rider.id)?.average ?? null,count:ratings.get(rider.id)?.count ?? 0}));
  return <DeliveryMonitoring rows={failed ? [] : rows} riders={riders} failed={failed} ratingsFailed={Boolean(ratingResult.error)} admin={profile.role==="admin"} initialQuery={q} initialStatus={status}
    notice={error ? "Assignment could not be saved. The order must be ready and unassigned, and the rider must be active." : updated==="delivery" ? "Rider assigned to that order." : undefined} noticeError={Boolean(error)} />;
}
