/** Only dedicated payment fields may enable GCash; restaurant phones are not wallets. */
export function normalizeGcashNumber(value: string) {
  const cleaned = value.trim().replace(/[\s()-]/g, "");
  return cleaned.replace(/^(?:\+63|63)(9\d{9})$/, "0$1");
}

export function gcashIsAvailable(settings: { enabled: boolean; accountName: string | null; accountNumber: string | null }) {
  return settings.enabled && !!settings.accountName?.trim() && /^09\d{9}$/.test(settings.accountNumber ?? "");
}

export function managedGcashQrPath(value: string | null): value is string {
  return !!value && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpeg|webp)$/.test(value);
}
