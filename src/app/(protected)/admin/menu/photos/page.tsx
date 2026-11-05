import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { matchMenuPhotos } from "@/lib/menu-photo-matching";
import { readPhotoMenuRows } from "@/lib/menu-photo-upload";
import { PhotoImport } from "./photo-import";

export default async function MenuPhotosPage() {
  await requireRole(["admin"]);
  let matches;
  try { matches = matchMenuPhotos(await readPhotoMenuRows(await createClient())); }
  catch { return <main className="p-6"><h1 className="text-2xl font-semibold">Menu photo import unavailable</h1><p className="mt-3">The current menu could not be read. Nothing was changed. Refresh and try again.</p><Link className="mt-4 inline-block underline" href="/admin/menu">Back to menu administration</Link></main>; }
  return <main className="mx-auto max-w-7xl space-y-6 px-5 py-10 sm:px-8">
    <header className="space-y-3">
      <Link className="text-sm text-primary hover:underline" href="/admin/menu">← Menu administration</Link>
      <h1 className="text-3xl font-semibold">Import supplied menu photos</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">67 supplied photos, compressed below 1 MB each. Exact, unique recipe matches only. Photos are uploaded to Supabase Storage and their URLs saved in menu_items. This does not add menu items, change availability, set stock, or overwrite existing images. One photo is shared by all servings of an item.</p>
    </header>
    <PhotoImport matches={matches} />
  </main>;
}
