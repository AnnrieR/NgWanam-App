import type { SupabaseClient } from "@supabase/supabase-js";

export type DeliveryArea = { id: string; name: string; fee: number };

export async function loadDeliveryAreas(client: SupabaseClient): Promise<DeliveryArea[]> {
  const rows: DeliveryArea[] = [];
  for (let offset=0; ; offset+=500) {
    const { data, error } = await client.from("delivery_areas").select("id,name,fee").eq("is_active",true).order("name").order("id").range(offset,offset+499);
    if (error) throw new Error("Supported delivery areas could not be loaded.");
    rows.push(...(data ?? []).map(row => ({ id: row.id, name: row.name, fee: Number(row.fee) })));
    if (!data || data.length<500) return rows;
  }
}

export function searchDeliveryAreas(areas: DeliveryArea[], query: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/\bbrgy\.?\b/g,"barangay").replace(/\bsanta\b/g,"sta").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
  const words = normalize(query).split(" ").filter(Boolean);
  return areas.filter(area => words.every(word => normalize(area.name).includes(word)));
}
