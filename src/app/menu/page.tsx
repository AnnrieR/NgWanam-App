import { requireRole } from "@/lib/auth";
import { one } from "@/lib/embedded";
import { createClient } from "@/lib/supabase/server";
import { loadMenuWithCompatibility } from "@/lib/menu-schema";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { MenuCrud, type CategoryOption, type MenuRow } from "./menu-crud";

export const dynamic = "force-dynamic";

type MenuPageProps = { searchParams: Promise<{ error?: string; updated?: string }> };

/** PostgREST answers a to-one relation with an object and a to-many one with an array. */
type RawItem = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  category_id: string;
  is_best_seller?: boolean;
  requires_preorder?: boolean;
  is_active?: boolean;
  approval_status?: string;
  categories?: { id?: string; name?: string } | Array<{ id?: string; name?: string }> | null;
  menu_variants?:
    | Array<{ id?: string; name?: string; serving_label?: string; price?: number; is_active?: boolean; retired_at?: string | null }>
    | { id?: string; name?: string; serving_label?: string; price?: number; is_active?: boolean; retired_at?: string | null }
    | null;
};

const notices: Record<string, { ok: boolean; text: string }> = {
  "image-invalid": { ok: false, text: "Choose exactly one JPG, PNG, or WebP image, smaller than 1 MB." },
  "image-upload-failed": { ok: false, text: "The image could not be uploaded. Please try again." },
  created: { ok: true, text: "Menu item created. Staff submissions stay off the customer menu until an admin approves them." },
  deleted: { ok: true, text: "Menu item deleted, along with its servings and stock rows." },
  "item-updated": { ok: true, text: "Menu item updated." },
  "category-created": { ok: true, text: "Category created." },
  "variant-created": { ok: true, text: "Serving size added." },
  "variant-updated": { ok: true, text: "Serving details and price updated." },
  "invalid-entry": { ok: false, text: "Name, category, serving, and a non-negative price are required." },
  "invalid-item": { ok: false, text: "That item could not be read. Try again." },
  "invalid-category": { ok: false, text: "Category name is required." },
  "invalid-variant": { ok: false, text: "Serving name, label, and a non-negative price are required." },
  "create-failed": { ok: false, text: "The item could not be created." },
  "delete-failed": { ok: false, text: "That item could not be deleted - it may already be gone." },
  "delete-in-use": { ok: false, text: "This item has unfinished orders. Complete or cancel them before deleting it." },
  "item-update-failed": { ok: false, text: "The item could not be saved." },
  "category-create-failed": { ok: false, text: "The category could not be created." },
  "variant-create-failed": { ok: false, text: "The serving size could not be added." },
  "update-failed": { ok: false, text: "The price could not be saved." },
};

export default async function MenuPage({ searchParams }: MenuPageProps) {
  const { profile } = await requireRole(["staff", "admin"]);
  const { error, updated } = await searchParams;
  const supabase = await createClient();

  const [{ data: categoryRows }, { data: itemRows, error: menuLoadError, servingDeletionAvailable }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    loadMenuWithCompatibility(supabase),
  ]);

  if (menuLoadError) return <p role="alert" className="p-6 text-destructive">Menu data could not be loaded. Ask an administrator to check the database connection and required menu migrations, then refresh. Existing menu records have not been removed.</p>;

  const categories = ((categoryRows ?? []) as Array<{ id: string; name: string }>).map((category) => ({
    id: category.id,
    name: category.name,
  })) satisfies CategoryOption[];

  const rows = ((itemRows ?? []) as RawItem[]).map((item): MenuRow => {
    const category = one(item.categories);
    const raw = item.menu_variants;
    const variants = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(variant => variant && !variant.retired_at);
    return {
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      imageUrl: item.image_url ?? null,
      categoryId: item.category_id,
      category: category?.name ?? "Uncategorized",
      isBestSeller: item.is_best_seller ?? false,
      requiresPreorder: item.requires_preorder ?? false,
      isActive: item.is_active ?? true,
      approvalStatus: item.approval_status ?? "approved",
      variants: variants.map((variant) => ({
        id: variant.id ?? "",
        name: variant.name ?? "",
        servingLabel: variant.serving_label ?? "",
        price: Number(variant.price ?? 0),
        isActive: variant.is_active ?? true,
      })),
    };
  });

  const notice = (updated && notices[updated]) || (error && notices[error]) || null;
  const itemCount = rows.length;
  const servingCount = rows.reduce((total, row) => total + row.variants.length, 0);

  return (
    <main className="min-h-screen w-full px-5 py-10 sm:px-8 lg:px-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Ng Wanam Food House</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Menu</h1>
          <p className="mt-2 text-muted-foreground">
            {itemCount} items across {categories.length} categories · {servingCount} serving sizes with their own prices.
          </p>
        </div>
        {profile.role === "admin" && <Button render={<Link href="/admin/menu" />} variant="outline">Review menu submissions</Button>}
      </header>

      {notice && (
        <p
          className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
            notice.ok
              ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300"
              : "bg-red-50 text-destructive dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {notice.text}
        </p>
      )}

      <MenuCrud categories={categories} rows={rows} servingDeletionAvailable={servingDeletionAvailable} />
    </main>
  );
}
