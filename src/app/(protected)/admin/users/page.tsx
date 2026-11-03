
import { Form } from "@/components/ui/form";

import { FormSelect, SelectOption } from "@/components/ui/form-select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, deleteAccount } from "../actions";
import { ConfirmAction } from "@/components/confirm-action";
import { CreateAccountForm } from "./create-account-form";

const roles = [{ value: "admin", label: "Administrator" }, { value: "staff", label: "Staff" }, { value: "delivery", label: "Delivery" }, { value: "customer", label: "Customer" }];

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; error?: string; updated?: string }> }) {
  const { user } = await requireRole(["admin"]);
  const { q = "", role = "", error, updated } = await searchParams;
  const supabase = await createClient();
  const result = await supabase.from("profiles").select("id, full_name, email, phone, role, is_active").is("deleted_at", null).order("full_name");
  const profiles = result.data ?? [];
  const needle = q.trim().toLowerCase();
  const visible = profiles.filter((profile) => (!role || profile.role === role) && `${profile.full_name} ${profile.email} ${profile.phone ?? ""}`.toLowerCase().includes(needle));
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold">User Management</h1><p className="mt-2 text-sm text-muted-foreground">Create administrator, staff, and delivery accounts. Manage account roles and access.</p></header>
    <CreateAccountForm />
    {(error || updated) && <p role="status" className={`rounded-xl p-4 text-sm ${error ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300"}`}>{error === "own-access" ? "You cannot delete or remove your own administrator access." : error === "unfinished-work" ? "Finish or cancel this account's open orders/assigned deliveries before deleting." : error === "last-admin" ? "The last active administrator cannot be deleted." : error === "delete-retry" ? "The account is deactivated, but deletion did not finish. Retry Delete." : error ? "Account action failed. Please try again." : updated === "deleted" ? "Account deleted. Login access removed; anonymized transaction history retained." : updated === "created" ? "Account created. The user can sign in with the assigned password." : "Account access updated."}</p>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{roles.map(({ value, label }) => <div key={value} className="rounded-xl border bg-white p-4 dark:bg-slate-900"><p className="text-xs text-muted-foreground">{label} accounts</p><p className="mt-2 text-2xl font-bold">{profiles.filter((profile) => profile.role === value).length}</p></div>)}</div>
    <Form action="/admin/users" className="flex flex-wrap gap-3"><Input name="q" type="search" defaultValue={q} placeholder="Search name, email, or phone" aria-label="Search users" className="max-w-sm" /><FormSelect name="role" defaultValue={role} aria-label="Filter by role" className="rounded-lg border bg-background px-3 py-2 text-sm"><SelectOption value="">All roles</SelectOption>{roles.map(({ value, label }) => <SelectOption key={value} value={value}>{label}</SelectOption>)}</FormSelect><Button type="submit" variant="outline">Search</Button></Form>
    {result.error ? <p role="alert" className="text-sm text-red-600">Accounts could not be loaded. Please try again.</p> : <div className="overflow-x-auto rounded-xl border bg-white dark:bg-slate-900">
      <Table className="w-full min-w-[720px] text-left text-sm">
        <TableHeader className="border-b bg-muted/50"><TableRow>{["Account", "Contact", "Role / access", "Actions"].map((heading) => <TableHead key={heading} className="px-4 py-3 font-semibold">{heading}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{visible.map((profile) => <TableRow key={profile.id} className="border-b last:border-0">
          <TableCell className="px-4 py-4"><p className="font-semibold">{profile.full_name || "Unnamed account"}{profile.id === user.id && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}</p><span className={`mt-1 inline-block text-xs ${profile.is_active ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{profile.is_active ? "Active" : "Inactive"}</span></TableCell>
          <TableCell className="px-4 py-4"><p>{profile.email}</p><p className="mt-1 text-xs text-muted-foreground">{profile.phone || "No phone number"}</p></TableCell>
          <TableCell className="px-4 py-4"><Form id={`user-${profile.id}`} action={updateProfile} className="flex flex-wrap items-center gap-3"><input type="hidden" name="profileId" value={profile.id} /><FormSelect name="role" defaultValue={profile.role} aria-label={`Role for ${profile.email}`} className="rounded-lg border bg-background px-3 py-2 text-sm">{roles.map(({ value, label }) => <SelectOption key={value} value={value}>{label}</SelectOption>)}</FormSelect><Label className="flex items-center gap-2 text-xs"><Input type="checkbox" name="isActive" defaultChecked={profile.is_active} />Active access</Label></Form></TableCell>
          <TableCell className="px-4 py-4"><div className="flex gap-2"><Button type="submit" form={`user-${profile.id}`} size="sm">Save</Button>{profile.id !== user.id && <ConfirmAction action={deleteAccount} fields={{ profileId: profile.id }} title={`Delete ${profile.full_name || profile.email}?`} description="Permanently remove login access and personal profile details. Anonymized transaction history is retained. Accounts with unfinished orders or deliveries cannot be deleted." triggerLabel="Delete account" confirmLabel="Delete account permanently" />}</div></TableCell>
        </TableRow>)}</TableBody>
      </Table>{!visible.length && <p className="p-6 text-center text-sm text-muted-foreground">No accounts match your search.</p>}
    </div>}
  </div>;
}
