# Ng Wanam Assist — Gemini AI customer support

## What changed

The shared chat panel (customer support page and floating widget) now uses a
server-side Google Gemini API integration for signed-in, active accounts.
The default model is `gemini-3.5-flash-lite`. Model discovery still listed
`gemini-2.5-flash-lite`, but an actual generation request returned 404: no longer
available to new users, recommending `gemini-3.5-flash-lite` instead. Discovery
alone is therefore not proof that a model works for the configured project.
The integration uses the documented `generateContent` REST
endpoint through native server `fetch`; no new SDK/dependency is required.

This is grounded support, not an autonomous agent. There are no model write
tools or model-generated SQL, URLs or server actions. It cannot place/cancel
orders, change stock, verify payments, or send notifications.

### Sources

- Menu: the same `get_menu_catalog` RPC as customer shopping. Only active,
  approved items/servings; sellable stock is on-hand minus reservations.
- Delivery: active `delivery_areas` names and fees, not the obsolete flat fee.
- Restaurant: explicitly allowlisted public information from
  `get_restaurant_info`; no secrets, customer profile or QR/proof paths.
- Order status: deterministic account-owned database lookup. Direct tracking
  questions bypass the model. For differently worded personal-order questions,
  Gemini can classify the intent; the server then runs the same ownership-filtered
  lookup and displays a tracking card. The model is never given order rows,
  receipts, payments, customer/rider identity, phone or delivery address.

The AI is instructed to use only the supplied facts, acknowledge missing data,
not infer delivery fees or ETA, and decline unrelated questions or write requests.
Prompt instructions reduce hallucinations, but cannot guarantee correctness;
the UI asks users to confirm prices/availability/fees at checkout.
Datasets are bounded and exact counts detect truncation: incomplete menu/area
datasets are explicitly unavailable to the model, not silently presented as full.

## Configuration

In the project-root `.env.local`, beside `package.json`:

```dotenv
GEMINI_API_KEY=your_own_key
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_ENABLED=true
```

Keep the existing server-only `SUPABASE_SERVICE_ROLE_KEY`: it invokes only the
private-budget RPC in this feature. All menu/order reads use the caller's normal
Supabase client/session, never the service role. No privileged key reaches the
browser. Never use a `NEXT_PUBLIC_` prefix for either secret or commit `.env.local`.
Restart Next.js after changing environment variables.

Apply the incremental migration to an existing local DB (no reset/reseed):

```powershell
npx supabase migration up --local
npm run dev
```

Each student needs their own API configuration; Git does not distribute keys.
Localhost is supported, but Gemini needs internet and available provider quota.
Deployment requires configuring server environment variables and applying the
new migration to the correct hosted database as a separate deployment task.

## Usage ceilings and failure handling

Migration `20261027010000_chatbot_ai_budget.sql` adds only a private usage table
and a server-only budget RPC. It does not change orders, stock, payments or logs.

- 3 attempted AI calls per account per UTC clock minute; 25 per UTC day.
- 5 attempted AI calls globally per UTC clock minute; 100 per UTC day.
- One atomic transaction lock enforces shared ceilings across app processes.
- Counters survive app restarts; old daily rows are pruned after seven days
  when another reservation is attempted. Denied attempts do not increment them.
- Only the service-role RPC can reserve attempts; browsers cannot choose another
  user's budget or directly read/update counters. Missing budget configuration or
  migration fails closed: no Gemini call is made.
- At most one provider attempt per question, 500 input characters, bounded
  current context (60,000 serialized characters maximum) and 700 output tokens.
- A 15-second provider timeout; no automatic retries or fallback model costs.
- Missing/disabled key, quota denial, network/API error, safety block, malformed
  JSON or truncated output falls back to saved FAQs with an explicit non-AI label.
- Guest users receive saved FAQs/sign-in guidance only. Direct authenticated
  tracking works without external AI or after the AI budget is exhausted.

These are **application request ceilings, not provider free-tier guarantees or
currency budgets**. Google project/model quota and billing settings still apply,
including use of this key outside this app. Set provider budgets/alerts and key
restrictions in Google Cloud/AI Studio. `GEMINI_ENABLED=false` stops new external
calls without disabling saved FAQ help or order lookups.

## Privacy and UI

- The current question plus allowlisted public restaurant facts go to Google.
  Full chat history and authenticated order records are not transmitted.
- Common email, Philippine mobile-number and API-key/JWT patterns in the current
  question are redacted. This is not guaranteed anonymization: free-form names,
  addresses or other sensitive text may remain. The UI warns users not to share
  personal details/secrets; review Google's current data-use terms before real
  customers, particularly free-tier terms.
- Answer labels distinguish `Gemini AI`, `Account lookup · not AI-generated`,
  and `Saved help · AI not used`. Provider errors/key values are never returned
  to the client or logged; only a sanitized HTTP code/failure category is logged.
- Existing account-scoped browser history and restaurant chat logging remain.
  New log answers include a source label; failed logging does not break support.
- This first integration is single-turn: each question should include its subject.
  Prior assistant answers are not trusted as current stock/fee/order evidence.

## Verification

```powershell
npm run test:chatbot
npx tsc --noEmit
npm run lint
```

`test:chatbot` runs entirely offline with mocked provider and Supabase responses:
parsing, redaction, disabled/invalid config, network/429/safety/truncation handling,
request bounds, guest/inactive/budget gates, direct/semantic own-order filtering,
public-context allowlists and truncation detection.

`supabase/tests/chatbot_ai_budget.sql` tests permissions and user/global ceilings
inside a rolled-back transaction. The local seeded customer is required. No
external request is sent by SQL tests. Physical-phone and hosted deployment
verification are separate; do not claim those based on localhost tests.

### Local verification results — 27 October 2026

- Live signed-in browser request with `gemini-3.5-flash-lite` returned a Tagalog
  answer for Canton, Good for 1: PHP 130, 24 available servings. Both matched a
  separate read-only `get_menu_catalog` query at test time.
- Direct tracking displayed the database card without an AI attempt. The natural
  question "Naipadala na po ba ang binili ko?" was classified by Gemini and then
  resolved to the same secure account lookup, not a generated status.
- The initial provider 404 produced an explicitly labeled non-AI fallback.
- ESLint, TypeScript, offline chatbot tests, strict image tests and SQL schema
  lint passed. The budget regression passed and rolled back; actual usage
  counters were not cleared to bypass limits.
- Desktop light/dark at 1440/1024/800 CSS widths passed: no horizontal overflow
  and the chat input remained visible. This is not physical-phone verification.
- Independent production build passed on retry. Next.js displayed a known
  security-vulnerability upgrade recommendation; it is not resolved by a passing
  build. A dependency security update remains a separate authorized task.
- All 17 existing operational/configuration table hashes matched after applying
  the migration and running rolled-back SQL tests. After live chats, all 16
  non-chat-log tables still matched; only expected chat logs and private AI usage
  were added. No stock, orders, fees, payments or profiles were changed.
- Checked 15 generated development client JS/map assets: neither the actual
  Gemini key nor the Supabase service key appeared in them.
