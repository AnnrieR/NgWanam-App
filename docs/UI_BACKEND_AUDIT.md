# UI/UX and backend audit — 8 October 2026

## Implemented UI changes

- Shared shadcn/Base UI primitives replace handwritten visible buttons, labels,
  select menus, checkboxes, checkout radio groups, tables, expandable sections,
  and modal dialogs throughout Customer, Staff, Admin, Rider, auth, and public
  components. This keeps the project's existing `base-luma` style, rather than
  mixing Radix and Base UI or adding a second component framework.
- Date and date/time inputs now use shadcn Popover + Calendar with custom
  month/year selects. No native calendar popup. Existing Philippine order-date
  defaults, date filtering, Clear, and pagination-reset behavior remain.
- File selection uses a shadcn upload button, filename and inline validation;
  delivery has preview and pending upload feedback. The actual file input is
  hidden because web browsers require it to access local files.
- Forms show invalid-field messages in-app instead of native browser validation
  tooltip popups. Server actions still validate every mutation independently.
- Native `<dialog>` and `<details>` presentation is replaced by shadcn Dialog,
  AlertDialog and Collapsible. Keyboard/focus/portal behavior comes from Base UI.
- Menu and FAQ permanent deletion use a reusable confirmation modal; Cancel
  sends no mutation. Cart clear/remove and removing the final serving also ask
  for confirmation. Profile-photo removal and customer order cancellation ask
  for confirmation. Background cleanup of replaced/failed uploads is not a
  user-triggered delete button and intentionally does not show extra prompts.
- Icon-button `title` hints use shadcn Tooltip. Link-rendered Buttons now have
  correct non-native-button semantics. Dark-mode charcoal and light palettes
  are preserved.

Semantic HTML (links, headings, layout, hidden form fields, internal input/SVG
elements) remains intentional. shadcn itself renders DOM elements; the goal is
consistent accessible application controls, not eliminating HTML or replacing
the operating system's required file chooser.

## Upload policy

All **new** avatar, menu and delivery-proof uploads must be strictly smaller
than **1 MiB (1,048,576 bytes)**. The maximum accepted size is **1,048,575 bytes**.

1. Client: common upload UI checks size/type and clears invalid selection.
2. Server: `src/lib/validate-image.ts` checks size **before reading bytes** and
   checks that the file signature agrees with its declared MIME type.
3. Storage: migration `20261008090000_limit_all_image_uploads.sql` limits all
   three buckets to 1,048,575 bytes and restricts allowed MIME types.

Menu/proof support JPG, PNG and WebP. Avatars additionally support GIF/AVIF.
Existing uploaded/public assets are not deleted or recompressed. Large images
must be resized by the user before upload; adding a heavy image-conversion
service is unnecessary for this local demo.

Avatar changes now clean up a new file if the profile save fails and attempt
to remove only the current user's replaced/removed old file after a successful
save. Menu/proof failure cleanup remains intact. Storage cleanup is best-effort;
the system does not add a background queue solely for this local workload.

## Lightweight backend architecture

**Retain:** Next.js server components → Server Actions → Supabase Auth/RLS,
Postgres RPCs and Storage. No additional REST layer, ORM, Redis, service worker,
job queue, image microservice or second authentication system was introduced.

- Authorization remains on the server and in RLS/RPC guards, never just in UI.
- Account creation's privileged Auth client remains server-only; shadcn CLI
  was moved to development dependencies, not runtime dependencies.
- `requireRole` shares its auth/profile lookup using **request-scoped React
  cache**, avoiding repeated layout/page reads. It does not cache permissions
  across users or requests. Avatar actions reuse that profile read.
- Inventory reservation/release/deduction remains atomic in existing SQL RPCs.
  Deduction is still at staff Completed, not rider Delivered.
- Shared image validation replaces duplicated menu/proof sniffing and adds
  signature validation for avatars. The Server Action body limit is reduced
  from 6 MB to 2 MB (headroom for multipart form overhead; image limit is lower).
- Private delivery proofs and authorized signed URLs remain private. Active
  customer, approved menu, cancelled-delivery, and COD-only guards remain.
- Visibility-aware 15-second polling is retained instead of adding a realtime
  framework for a few local sessions.

### Scaling follow-ups (not necessary for the local demo)

- Operational/customer lists currently fetch their authorized local dataset
  and paginate/filter in the client. For large deployments, move date/search/
  pagination and aggregate counts into paginated queries/RPCs. Do not just add
  a row limit that silently corrupts counts or hides active deliveries.
- Reports/conversation totals should use dedicated DB aggregation when logs
  grow past Supabase's default response-row limit.
- Scheduled orphan cleanup, stricter image decoding and distributed rate limits
  are production hardening, not implemented or claimed as local-demo features.

## Dependencies

- Next.js and matching ESLint config updated from 16.3.6 to **16.4.0**.
- Compatible sharp/MCP SDK/source-map dependency updates applied without
  `npm audit fix --force` or downgrading to an incompatible framework version.
- `npm audit --omit=dev`: **0 vulnerabilities** at verification time.
- Full development audit still reports **8 high-severity toolchain advisories**
  through glob/braces/micromatch, ESLint and shadcn/ts-morph dependencies. These
  are not included in the production dependency audit. The suggested forced
  shadcn/ESLint downgrades were not applied. Do not feed untrusted project/glob
  data to these tools; track upstream compatible fixes. This is an outstanding
  audit warning, not a claim that the entire dependency tree is clean.

## Verification

- ESLint and TypeScript checks; isolated optimized production build (no build
  against the running dev server's `.next`).
- Authenticated HTTP smoke tests across 27 Customer/Staff/Admin/Rider routes
  and anonymous/wrong-role access denial.
- Browser: custom staff calendar, menu dialog/select/checkbox form values,
  menu delete Cancel, FAQ create → delete Cancel → confirmed deletion, checkout
  pickup/GCash radio form values, cart Cancel/confirmed clear, and exactly-1-MB
  client rejection.
- Browser: shadcn proof modal preview/invalid selection/Cancel/Escape/reset and
  real server upload → Delivered on a generated order; fixture order/photo
  removed after safely cancelling/releasing its reservation.
- `npm run test:images`: strict size boundary, signature/MIME checks, and
  empty/fake/oversized rejection.
- Direct Storage test: exactly 1 MB returns **413** even when bypassing UI;
  small PNG accepted and removed. All three bucket limits checked.
- Existing workflow SQL regression tests remain rollback-only.

The audit includes shared controls and static source coverage; it is not a
promise that every possible input combination on every page has been tested.
Email recovery and production-only integrations remain outside the local scope.
