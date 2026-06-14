# DOOODHWALA — Bold Rebrand Plan

Direction: **bold, fresh dairy identity** — confident type, soft deep cards,
a vivid brand gradient, generous spacing, friendly motion. Keep it premium but
warm (this is a daily-habit consumer app, not a fintech dashboard).

## New brand tokens (proposed)
| Token | Value | Use |
|---|---|---|
| brand / primary | `#1B67B0` → gradient to `#2E8BD8` | Buttons, headers, hero |
| brand accent | `#16A34A` (fresh green) | Success, "fresh", milk drop |
| cream | `#FFF8EF` | Warm surface tint / hero backdrops |
| ink | `#10233B` | Headings (deeper than current foreground) |
| radius | cards `20`, buttons `14`, pills `999` | softer, more modern |
| shadow | softer/larger blur, lower opacity | depth without harshness |

Implementation: extend `theme/index.ts` with `gradients`, `cream`, deeper `ink`,
and a `useThemeTokens()` helper — **add** tokens, don't break existing `primary`
(so un-touched screens keep working). Apply screen-by-screen.

## Screen order (one at a time, each self-contained + testable)
1. **LoginScreen** — first impression. Hero gradient, big logo, large title,
   refined phone/OTP inputs, animated button. (START HERE)
2. **CustomerDashboardScreen** — greeting header, bold action cards, cleaner
   settings dropdown.
3. **YDPageScreen** — premium dairyman card, group banner, search.
4. **ChatComponent** — message bubbles, bill card, the order numpad panel.
5. **BillsScreen + ViewOrders** — statement-style cards, status pills, PDF buttons.
6. **MilkmanDashboardScreen** — earnings hero, customer/order cards.
7. **CheckoutScreen** — trust-forward, method tiles.
8. Shared: empty states, loaders, toasts.

## Rules for each screen
- Pull colors from the active palette (light/dark) — never hardcode that breaks dark mode.
- Keep all existing logic/handlers; only change presentation.
- Test on a build before the next screen.
- Don't ship to testers until a batch looks right (work on a branch).

## Risk note
App is in closed testing → production. Do the rebrand on a **branch**, build
locally, eyeball each screen, and only merge once a coherent batch is done — so
the live closed-test build stays stable.
