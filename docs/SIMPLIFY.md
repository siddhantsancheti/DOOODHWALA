# DOOODHWALA — Logic Simplification Backlog

Opportunities to simplify/consolidate logic. Each item: what, why, risk. Tackle
opportunistically — none are urgent, all reduce future bugs. ✅ = safe/low-risk.

## Auth & login
- ✅ **Dead self-hosted OTP path.** The app migrated to Firebase Phone Auth, but `authAPI.sendOTP/verifyOTP`, `loginMutation`, `sendOtpMutation` in `useAuth.ts` and the backend `/send-otp` `/verify-otp` + `otpService` + `otpCodes` table are now unused by the mobile login. Remove the mobile dead paths; keep/retire the backend OTP endpoints deliberately. Cuts ~80 lines + a table.
- ✅ **`smsQueue` table / SMS gateway** — leftover from the old gateway; verify nothing writes to it, then drop.

## Payments
- **Three near-identical "mark bill paid" blocks** (Razorpay single, Razorpay group/stripe, COD OTP) each: lookup bill → set paid → record payment → (now) notifyBillPaid. Extract one `settleBill(billId, userId, method, paymentMeta)` helper. ✅ now that `notifyBillPaid` exists, this is a natural next step.
- **`amount` trust** is already handled (server reads bill amount) — good; keep that invariant when refactoring.

## Orders
- **Order creation now lives in two places** (chat send-time + accept fallback in `chatRoutes.ts`, plus `orderRoutes.ts` and subscription cron in `index.ts`). Consider a single `createOrder()` service so status transitions and inventory deduction aren't duplicated.
- **Inventory deduction** logic in the accept handler is long and JSON-shape-dependent (orderProduct vs orderItems). Normalise order items into one shape at write time (in `sendMessageHandler`) so downstream code reads one shape.

## Billing
- ✅ `generateMonthlyBill` and `generateGroupBill` share ~70% logic (aggregate un-billed orders → upsert bill → stamp billId). Extract a shared aggregator. Lower priority — they're correct now.

## Mobile data layer
- **Query-key strings repeated as literals** everywhere (`'/api/bills/list'`, `/api/chat/group/${id}`). Centralise in a `queryKeys.ts` to avoid typos and make invalidations consistent (the realtime work touched several call sites).
- **WebSocket event handling is ad-hoc** per screen. A small `useRealtimeInvalidation(map)` hook (event type → query keys) would replace the repeated `addMessageHandler` blocks in ChatComponent, YDPage, MilkmanDashboard, Bills.
- **Token storage**: `token` and `accessToken` are written as duplicates everywhere. Pick one key.

## Theme / UI
- `theme/index.ts` `componentStyles` is built from the static `colors` (light only) and is largely unused now that screens build styles from the active palette. Either make it palette-aware or delete it.
- Many screens re-declare `surfaceColor/textColor/textMuted/borderColor` locally. A `useThemeTokens()` helper returning these would cut repetition (and pairs well with the rebrand).

## Server structure
- Several route files repeat the `authHeader → jwt.verify → decoded.id` block. The `middleware/auth.ts` already exists — apply it as router middleware instead of inline verification in `authRoutes.ts` handlers.
