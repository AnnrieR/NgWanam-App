# Ng Wanam Food House Codebase

This document is a map of the repository for contributors and students. It describes the current implementation, not a proposed architecture.

## Project Summary

Ng Wanam Food House is a Filipino food ordering and operations system built with:

- Next.js 16 App Router
- React 19 and TypeScript
- Supabase Auth, PostgreSQL, Realtime, and Storage
- Tailwind CSS 4 and shadcn-style UI primitives
- Vercel-compatible frontend deployment

The application has a public restaurant website and menu, customer ordering, staff operations, delivery tracking, payment handling, inventory management, admin settings, reporting, activity logs, and a Gemini-powered support chatbot with saved FAQ fallback and secure own-order lookups. See `docs/GEMINI_CHATBOT.md` for configuration, usage ceilings and privacy boundaries.

## Repository Layout

```text
.
├── src/
│   ├── app/                    App Router routes, layouts, actions, and pages
│   ├── components/             Shared site, landing, chatbot, and UI components
│   ├── fonts/                  Local Egg Roll display font
│   └── lib/                    Supabase clients and shared domain helpers
├── supabase/
│   ├── migrations/             Ordered PostgreSQL schema, policies, functions, and seed data
│   └── config.toml             Local Supabase service configuration
├── proxy.ts                    Session refresh entry point for Next.js requests
├── public/                     Public static assets, if added
├── .env.example                Required frontend environment variables
├── components.json             shadcn component configuration
├── eslint.config.mjs           ESLint configuration
├── next.config.ts              Next.js configuration
├── package.json                Scripts and dependencies
├── postcss.config.mjs          Tailwind/PostCSS configuration
├── tsconfig.json               Strict TypeScript configuration and @/* alias
└── README.md                   Student installation and local development guide
```

## Application Routes

Route groups in parentheses organize layouts but do not appear in the URL.

| URL | Purpose | Access |
| --- | --- | --- |
| `/` | Restaurant landing page | Public |
| `/menu` | Menu catalog and local cart | Public |
| `/login` | Sign in | Public |
| `/register` | Create a customer account | Public |
| `/forgot-password` | Request password reset | Public |
| `/update-password` | Set a new password | Authenticated recovery session |
| `/auth/confirm` | Verify Supabase email/OTP links | Auth callback |
| `/account` | Customer profile and account actions | Customer |
| `/checkout` | Customer checkout | Customer |
| `/orders` | Customer order history | Customer |
| `/orders/[orderId]` | Order details and live status | Customer |
| `/staff` | Staff order and inventory dashboard | Staff or admin |
| `/staff/menu` | Menu and category maintenance | Staff or admin |
| `/staff/payments` | Payment review and processing | Staff or admin |
| `/delivery` | Assigned delivery dashboard | Delivery |
| `/admin` | Accounts, restaurant settings, and chatbot rules | Admin |
| `/admin/activity` | Recent audit activity | Admin |
| `/admin/reports` | Sales, active-order, and low-stock reports | Admin |

Important route files:

- `src/app/layout.tsx` defines document metadata, global fonts, global CSS, and the site chatbot.
- `src/app/(protected)/*/layout.tsx` files call `requireRole` before rendering protected sections.
- `src/app/(auth)/actions.ts` handles sign in and registration redirects.
- `src/app/auth/confirm/route.ts` exchanges Supabase email/OTP confirmation links for a session.
- `src/app/(protected)/**/actions.ts` files contain server actions for mutations and redirect-based feedback.

## Request and Rendering Model

Most pages are React Server Components. They read data with the server Supabase client and perform mutations through Next.js Server Actions.

Client components are used only where browser state or interaction is needed, including:

- `src/components/site-nav.tsx` for responsive navigation state
- `src/components/chatbot.tsx` for browser-side chatbot requests
- `src/app/menu/menu-catalog.tsx` for local-storage cart state and quantity controls
- `src/app/(protected)/checkout/checkout-form.tsx` for checkout inputs
- `src/app/(protected)/orders/[orderId]/order-status.tsx` for Supabase Realtime updates
- `src/components/reveal.tsx`, `menu-tabs.tsx`, and `reviews.tsx` for interactive presentation
- `src/components/ui/*` where the underlying UI library requires client components

The request flow is:

1. `proxy.ts` calls `src/lib/supabase/proxy.ts` to refresh the Supabase session cookie on non-static requests.
2. Public server pages call restricted public RPCs such as `get_restaurant_info` and `get_menu_catalog`.
3. Protected layouts call `src/lib/auth.ts` and redirect unauthenticated or unauthorized users.
4. Server actions validate input, call Supabase tables or RPCs, revalidate affected paths, and redirect with a success or error query parameter.

`proxy.ts` refreshes sessions but is not the authorization boundary. Role checks live in protected layouts and server-side actions/RPCs.

## Shared Libraries

| File | Responsibility |
| --- | --- |
| `src/lib/auth.ts` | `AppRole`, role home paths, active-user checks, and `requireRole` |
| `src/lib/cart.ts` | Cart item shape and `ng-wanam-cart` local-storage key |
| `src/lib/hours.ts` | Restaurant opening-status and hours formatting helpers |
| `src/lib/restaurant.ts` | Restaurant info type and server-side restaurant data access |
| `src/lib/utils.ts` | Shared utility helpers, including class-name composition |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Cookie-backed server Supabase client |
| `src/lib/supabase/proxy.ts` | Request-time Supabase session refresh |

## Components

Site chrome:

- `src/components/site-header.tsx` renders the public header and restaurant contact information.
- `src/components/site-nav.tsx` provides responsive navigation.
- `src/components/site-footer.tsx` renders footer content.

Landing page sections:

- `hero.tsx` primary call to action and contact entry point
- `gallery.tsx` catalog-driven image gallery
- `our-story.tsx` restaurant story and information
- `menu-section.tsx` featured catalog groups
- `order-online.tsx` sample order call to action
- `reviews.tsx` testimonials carousel/interaction
- `coupons.tsx` hours and delivery-area information
- `menu-tabs.tsx` category tab interaction
- `common.tsx` shared landing-page presentation helpers

Other shared components:

- `src/components/chatbot.tsx` sends user questions to `match_chatbot_rule`.
- `src/components/reveal.tsx` provides client-side reveal animation behavior.
- `src/components/ui/*` contains button, card, field, input, label, separator, spinner, and textarea primitives.

## Authentication and Roles

Roles are defined in `src/lib/auth.ts` and the initial migration:

| Role | Home | Main capabilities |
| --- | --- | --- |
| `customer` | `/account` | Browse, order, view orders, cancel eligible orders |
| `staff` | `/staff` | Process orders, manage inventory, payments, and menu |
| `delivery` | `/delivery` | Update assigned delivery status |
| `admin` | `/admin` | All staff capabilities plus accounts, settings, rules, reports, and activity |

New registrations become customers. Admins change role and active status through `admin_update_profile`. Inactive users are signed out by `requireRole`.

Authorization is enforced at multiple layers:

- Protected layouts restrict access before page rendering.
- Server actions check the current authenticated user before mutations.
- PostgreSQL RLS policies restrict table reads and writes.
- Security-definer RPCs validate ownership and staff/admin permissions for sensitive state changes.

## Ordering Workflow

1. `/menu` loads the public catalog and stores selected variants in browser local storage under `ng-wanam-cart`.
2. The customer submits checkout from `/checkout`.
3. The `place_order` database function rechecks prices and stock, locks inventory, reserves stock, creates the order items and payment record, and calculates delivery fees server-side.
4. The customer is redirected to `/orders/[orderId]` and the cart is cleared client-side after success.
5. Staff moves orders through `pending`, `confirmed`, `preparing`, `ready`, and `completed`.
6. Customers can cancel orders in eligible early states through `cancel_own_order`; reserved stock is released.
7. The order detail client subscribes to Supabase Realtime for status changes.

## Delivery and Payment Workflows

Delivery status progresses through:

```text
assigned -> out_for_delivery -> delivered
```

Staff assigns ready orders to active delivery users through `assign_delivery`. Delivery users can update only their own assignments through `update_delivery_status`.

Payment methods are `cod`, `card`, and `gcash`:

- New payments begin as `pending`.
- Staff can verify or reject GCash payments with `update_payment_status`.
- Debit/credit card is a manual on-delivery payment; no card data is stored.
- Payment becomes `paid` only when the order is completed; GCash must be verified first.

## Inventory Model

Inventory is stored per menu variant with current stock, reserved stock, and minimum stock.

```text
available stock = current stock - reserved stock
```

The database functions prevent current stock from being reduced below reserved stock. Reservations, releases, completions, and manual changes are recorded in `inventory_movements`. Completing an order deducts stock after the delivery workflow allows completion.

## Supabase Database

Core tables from `20260922220241_initial_schema.sql`:

- `profiles`: Auth-linked user identity, contact information, role, and active state
- `categories`: Menu categories and display ordering
- `menu_items`: Menu names, descriptions, images, and flags
- `menu_variants`: Serving variants and prices
- `inventory`: Current, reserved, and minimum stock by variant
- `restaurant_settings`: Restaurant identity, hours, contacts, service areas, fees, and GCash QR path
- `orders`: Customer orders, status, delivery information, and totals
- `order_items`: Immutable item-name, price, and quantity snapshots
- `payments`: Payment method, status, and GCash metadata
- `deliveries`: Assignment and delivery timestamps/status
- `inventory_movements`: Inventory audit history
- `chatbot_rules`: Active keyword-based chatbot responses
- `activity_logs`: Operational audit records

Database enums include `profile_role`, `order_status`, `payment_method`, `payment_status`, `delivery_status`, and `inventory_movement_type`.

The public catalog and restaurant data are exposed through restricted functions rather than unrestricted table access:

- `get_menu_catalog`
- `get_restaurant_info`
- `get_checkout_settings`
- `match_chatbot_rule`

## Migration History

Migrations run in timestamp order:

| Migration | Change |
| --- | --- |
| `20260922220241_initial_schema.sql` | Core enums, tables, triggers, RLS, ordering, status, and inventory functions |
| `20260922220336_seed_menu.sql` | Sample restaurant settings, categories, menu, variants, and zero inventory |
| `20260922233321_delivery_workflow.sql` | Delivery assignment and delivery-status functions |
| `20260923060911_admin_profile_management.sql` | Admin role and active-status management |
| `20260923061452_chatbot_responses.sql` | Chatbot seed rules and longest-keyword matching RPC |
| `20260923061920_admin_chatbot_rules.sql` | Admin chatbot-rule management permissions |
| `20260923070620_payment_workflow.sql` | Controlled payment verification, rejection, and completion |
| `20260923075708_checkout_settings.sql` | Public checkout-settings RPC |
| `20260923080032_activity_logs.sql` | Audit logging triggers and indexes |
| `20260923081744_menu_entry_creation.sql` | Staff/admin menu-item creation |
| `20260923082041_menu_variant_creation.sql` | Staff/admin variant creation |
| `20260923082347_menu_category_creation.sql` | Staff/admin category creation |
| `20260923090000_add_catalog_available_stock.sql` | Available-stock field in catalog output |
| `20260923093000_enable_order_status_realtime.sql` | Enables Realtime for `orders` |
| `20260923100000_harden_catalog_access.sql` | Replaces catalog view access with hardened RPC access |
| `20260923101000_add_public_restaurant_info.sql` | Public restaurant-information RPC |
| `20260923102000_restrict_settings_updates.sql` | Restricts restaurant-settings writes to controlled RPCs |
| `20260923120416_add_customer_order_cancellation.sql` | Customer cancellation and reserved-stock release |
| `20261005090000_add_card_payment_method.sql` | Adds debit/credit card as a manual payment method |
| `20261005090100_allow_card_payments.sql` | Allows card payments and staff settlement after completion |

## Local Development

Prerequisites:

- Node.js LTS and npm
- Git
- Docker Desktop
- Supabase CLI through `npx supabase`

Install and start:

```bash
npm install
cp .env.example .env.local
npx supabase start
npx supabase db reset
npm run dev
```

Windows PowerShell uses:

```powershell
copy .env.example .env.local
```

Local services configured in `supabase/config.toml`:

| Service | URL/port |
| --- | --- |
| Next.js app | `http://localhost:3000` |
| Supabase API | `http://127.0.0.1:55321` |
| Supabase database | port `55322` |
| Supabase Studio | `http://127.0.0.1:55323` |
| Supabase local email UI | port `55324` |

Useful commands:

```bash
npx supabase status
npx supabase stop
npx supabase db reset
npm run lint
npm run build
npm run start
```

Required application variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Both are consumed by the browser and server Supabase clients. The public landing page has a fallback shell when Supabase is not configured, but catalog, authentication, ordering, and chatbot functionality require a working Supabase connection.

The local seed creates an admin, two kitchen staff accounts, and one delivery rider. To create another local admin, register a user, open Supabase Studio, and run:

```sql
update public.profiles
set role = 'admin', is_active = true
where email = 'your_email@example.com';
```

## Scripts and Tooling

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js development server with Webpack |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

TypeScript is strict and uses the `@/*` alias for `src/*`. There is no test script or test suite in the current repository. Build and lint are the available automated checks.

## Deployment Notes

The frontend can be deployed to Vercel without Supabase variables as a visual landing-page shell. Add the two `NEXT_PUBLIC_SUPABASE_*` variables and redeploy to enable live data, authentication, ordering, and chatbot behavior.

The Supabase migrations must also be applied to the cloud project before backend-backed features work. Do not expose service-role credentials in frontend environment variables.

## Current Caveats

- `.env.example` contains blank values. Developers must use the URL and publishable key printed by `npx supabase status` for local development, or provide cloud values.
- `supabase/seed.sql` creates local-only thesis accounts and sets initial inventory to 25 servings per menu variant. These accounts must not be copied to production.
- Operating hours are stored as a single restaurant setting and are treated uniformly by the current helper/database shape rather than modeled as separate weekday records.
- No automated tests are currently committed. Changes to order, inventory, role, payment, or delivery functions should be checked with a local database reset and manual role-based workflow verification.
- `src/app/page.tsx` intentionally catches missing Supabase configuration so the public shell can render during frontend-only deployment.

## Contribution Checklist

1. Read the relevant route layout and server action before changing a protected flow.
2. Keep authorization in server code and database functions; do not trust browser-submitted roles, prices, totals, or stock.
3. Update or add a Supabase migration for schema and RPC changes. Do not edit an already-applied migration.
4. Run `npm run lint` and `npm run build`.
5. For database changes, run `npx supabase db reset` and verify the affected customer, staff, delivery, or admin workflow.
6. Check both the Supabase-configured path and the frontend-only fallback where the change affects public pages.
