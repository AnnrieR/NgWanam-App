
import { Form } from "@/components/ui/form";

import { Disclosure, DisclosureSummary } from "@/components/ui/disclosure";
import { Label } from "@/components/ui/label";
import { FormSelect, SelectOption } from "@/components/ui/form-select";
import Link from "next/link";
import { CalendarDays, HeartHandshake, IdCard, LockKeyhole, Mail, MapPin, Pencil, Phone, Save, Settings, ShieldCheck, Trash2, Truck, UserRound, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-input";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CustomerDashboard } from "@/components/customer-dashboard";
import { ThemeToggle } from "@/components/theme-toggle";

import { updateAccount } from "./actions";

type AccountPageProps = { searchParams: Promise<{ error?: string; updated?: string }> };

const errors: Record<string, string> = {
  "invalid-details": "Name, address, and birth date values were not accepted.",
  "invalid-birthdate": "Enter a valid birth date that is not in the future.",
  "avatar-invalid": "Profile photos must be PNG, JPG, WEBP, GIF, or AVIF and smaller than 1 MB.",
  "upload-failed": "The profile photo could not be uploaded.",
  "update-failed": "Account details could not be updated.",
};

const dateLong = new Intl.DateTimeFormat("en-PH", { dateStyle: "long" });
const dateShort = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const { profile, user } = await requireRole(["customer", "staff", "delivery", "admin"]);
  const { error, updated } = await searchParams;
  const supabase = await createClient();
  const { data: details } = await supabase
    .from("profiles")
    .select("full_name, email, phone, address, birth_date, gender, avatar_url, role, is_active, created_at")
    .eq("id", user.id)
    .single();

  const name = details?.full_name || profile.full_name || "Ng Wanam User";
  const roleLabel = details?.role === "admin" ? "Administrator" : details?.role === "delivery" ? "Delivery Personnel" : details?.role === "staff" ? "Staff" : "Customer";
  const avatarUrl = details?.avatar_url ?? null;
  const genderLabel = details?.gender === "female" ? "Female" : details?.gender === "male" ? "Male" : details?.gender === "non_binary" ? "Non-binary" : details?.gender === "prefer_not_to_say" ? "Prefer not to say" : "Not provided";

  return (
    <CustomerDashboard avatarUrl={avatarUrl} fullName={profile.full_name} role={profile.role}>
      <div className="mx-auto max-w-[1120px]">
        <header className="mb-5"><h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Profile</h1><p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Manage your account information and preferences.</p></header>

        {(error || updated) && <p className={`mb-4 rounded-md px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300"}`}>{error ? errors[error] ?? "Account details could not be updated." : "Account details updated."}</p>}

        <Card className="relative mb-4 overflow-hidden rounded-lg border border-orange-100 bg-gradient-to-r from-orange-50 to-white px-5 py-4 shadow-none dark:border-orange-950 dark:from-orange-950/60 dark:to-slate-900 sm:px-8">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-orange-300 bg-white text-orange-500 dark:border-orange-800 dark:bg-slate-800">
              {avatarUrl ? (
                /* eslint-disable @next/next/no-img-element -- profile photos come from Supabase Storage */
                <img alt="" className="size-full object-cover" src={avatarUrl} />
              ) : (
                <UserRound className="size-7" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{name}</h2>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">{roleLabel}</p>
              <p className="mt-2 flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300"><Mail className="size-3.5" />{details?.email || user.email}</p>
              <p className="mt-1 flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300"><Phone className="size-3.5" />{details?.phone || "No phone number added"}</p>
            </div>
          </div>
          <div className="pointer-events-none absolute right-5 bottom-0 hidden text-orange-200/70 dark:text-orange-900/60 sm:block"><UsersRound className="size-20" /></div>
        </Card>

        <Link href="/account/security" className="block rounded-lg border border-slate-200 p-4 text-sm font-semibold hover:underline dark:border-slate-700">Account security · Google sign-in</Link>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <Disclosure className="group border-b border-slate-100 dark:border-slate-800" id="edit-profile">
            <DisclosureSummary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400"><Pencil className="size-5" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900 dark:text-slate-100">Edit Profile</strong><small className="mt-1 block text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">Update your photo, name, contact details, address, birth date, and gender.</small></span>
            </DisclosureSummary>
            <Form action={updateAccount} className="grid gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60 sm:grid-cols-2">
              <Label className="grid gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">Full name<Input defaultValue={details?.full_name ?? ""} maxLength={120} name="fullName" required /></Label>
              <Label className="grid gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">Phone number<Input defaultValue={details?.phone ?? ""} inputMode="tel" maxLength={32} name="phone" /></Label>
              <Label className="grid gap-1 text-xs font-medium text-slate-700 sm:col-span-2 dark:text-slate-300">Address<Input defaultValue={details?.address ?? ""} maxLength={240} name="address" placeholder="House no., street, barangay, city" /></Label>
              <Label className="grid gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">Birth date<Input defaultValue={details?.birth_date ?? ""} name="birthDate" type="date" /></Label>
              <Label className="grid gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">Gender
                <FormSelect className="h-9 w-full min-w-0 rounded-3xl border border-transparent bg-input/50 px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm" defaultValue={details?.gender ?? ""} name="gender">
                  <SelectOption value="">Not provided</SelectOption>
                  <SelectOption value="female">Female</SelectOption>
                  <SelectOption value="male">Male</SelectOption>
                  <SelectOption value="non_binary">Non-binary</SelectOption>
                  <SelectOption value="prefer_not_to_say">Prefer not to say</SelectOption>
                </FormSelect>
              </Label>
              <Label className="grid gap-1 text-xs font-medium text-slate-700 sm:col-span-2 dark:text-slate-300">Profile photo
                <Input accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="w-full cursor-pointer rounded-3xl border border-transparent bg-input/50 text-sm" name="avatar" type="file" />
                <small className="mt-1 block font-normal text-slate-500 dark:text-slate-400">PNG, JPG, WEBP, GIF, or AVIF smaller than 1 MB.</small>
              </Label>
              {avatarUrl && <Label className="flex items-center gap-2 text-xs font-medium text-slate-700 sm:col-span-2 dark:text-slate-300"><Input className="size-4 accent-red-600" defaultChecked={false} name="removeAvatar" type="checkbox" />Remove current photo</Label>}
              <Button className="w-fit rounded-md sm:col-span-2" type="submit"><Save />Save changes</Button>
            </Form>
          </Disclosure>

          <Disclosure className="group border-b border-slate-100 dark:border-slate-800" id="personal-information">
            <DisclosureSummary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400"><IdCard className="size-5" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900 dark:text-slate-100">Personal Information</strong><small className="mt-1 block text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">Review the registered details Ng Wanam keeps for your account and deliveries.</small></span>
            </DisclosureSummary>
            <div className="grid gap-px border-t border-slate-100 bg-slate-200/60 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2">
              <InfoRow icon={<Mail />} label="Email address" value={details?.email || user.email || "Not provided"} />
              <InfoRow icon={<Phone />} label="Phone number" value={details?.phone || "Not provided"} />
              <InfoRow icon={<MapPin />} label="Delivery address" value={details?.address || "Not provided"} />
              <InfoRow icon={<CalendarDays />} label="Birth date" value={details?.birth_date ? dateLong.format(new Date(`${details.birth_date}T00:00:00`)) : "Not provided"} />
              <InfoRow icon={<HeartHandshake />} label="Gender" value={genderLabel} />
              <InfoRow icon={<ShieldCheck />} label="Account role" value={roleLabel} />
              <InfoRow icon={<LockKeyhole />} label="Account status" value={details?.is_active === false ? "Inactive" : "Active"} />
              <InfoRow icon={<UserRound />} label="Member since" value={details?.created_at ? dateShort.format(new Date(details.created_at)) : "Not available"} />
            </div>
          </Disclosure>

          <Disclosure className="group" id="settings">
            <DisclosureSummary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400"><Settings className="size-5" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900 dark:text-slate-100">Settings</strong><small className="mt-1 block text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">Appearance, sign-in security, and account preferences.</small></span>
            </DisclosureSummary>
            <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <div><p className="text-sm font-medium text-slate-900 dark:text-slate-100">Appearance</p><p className="text-[11px] text-slate-600 dark:text-slate-400">Switch between the light and dark theme.</p></div>
                <span className="flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1 dark:border-slate-700"><ThemeToggle /></span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <div><p className="text-sm font-medium text-slate-900 dark:text-slate-100">Password</p><p className="text-[11px] text-slate-600 dark:text-slate-400">Send a secure link to change your password.</p></div>
                <Button render={<Link href="/forgot-password" />} size="sm" variant="outline">Reset password</Button>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                <div><p className="text-sm font-medium text-slate-900 dark:text-slate-100">Saved cart</p><p className="text-[11px] text-slate-600 dark:text-slate-400">Items stay on this device until you check out.</p></div>
                <Button render={<Link href="/cart" />} size="sm" variant="outline">Open cart</Button>
              </div>
            </div>
          </Disclosure>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700 sm:grid-cols-4"><Feature icon={<Truck />} title="Fast Delivery" text="Hot food, on time" /><Feature icon={<ShieldCheck />} title="Secure Payments" text="100% safe & secure" /><Feature icon={<LockKeyhole />} title="Best Quality" text="Fresh ingredients" /><Feature icon={<Trash2 />} title="Easy Changes" text="Edit details anytime" /></div>
      </div>
    </CustomerDashboard>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-white px-5 py-4 dark:bg-slate-900">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400">{icon}</span>
      <span className="min-w-0">
        <strong className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</strong>
        <span className="block truncate text-sm text-slate-900 dark:text-slate-100">{value}</span>
      </span>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex items-center gap-3 bg-white px-4 py-4 dark:bg-slate-900"><span className="text-orange-500 [&_svg]:size-6">{icon}</span><span><strong className="block text-[10px] text-red-500 dark:text-red-400">{title}</strong><small className="mt-1 block text-[9px] text-slate-600 dark:text-slate-400">{text}</small></span></div>;
}
