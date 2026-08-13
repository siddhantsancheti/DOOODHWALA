# Household model — one chat, one customer, one bill

Change plan. Nothing here is implemented yet; this is the shape to approve
before code is written.

## The problem

A family orders through a shared chat, but every member is a separate
`customers` row. So today one household counts as three customers, appears as
three delivery stops, and — the part that costs money — can be billed three
times.

Two billing paths exist and they disagree:

| Path | Groups by | Called from |
|---|---|---|
| `generateMonthlyBill(milkmanId)` | `customerId` | the monthly cron, `0 0 1 * *` |
| `generateGroupBill(familyChatId)` | the chat's members | only `GET /api/groups/:id/bill`, on demand |

Both select unbilled messages with `billId IS NULL` and stamp what they take.
**Whichever runs first wins the orders.** If the cron fires before anyone opens
the group bill screen, the household gets three individual bills instead of
one, and the group bill then comes back empty. That is a live defect, not a
theoretical one.

Counting is the same bug wearing a different hat: the milkman's customer count
is `customers.length` ([MilkmanDashboardScreen.tsx:452](../mobile-app/src/screens/milkman/MilkmanDashboardScreen.tsx:452)),
which counts people, not doors.

## The model

**A chat is a customer.** One household = one `family_chats` row = one bill =
one delivery stop. A person ordering alone is a household of one.

The schema already assumes this — `bills.familyChatId`, `bills.paidBy`,
`orders.familyChatId`, `orders.orderedBy`, `chatMessages.familyChatId` all
exist. What is missing is that **solo customers have no chat row**. Chat rows
are only created by `POST /api/groups` ([groupRoutes.ts:52](../server/groupRoutes.ts:52));
a solo customer's conversation is just `chat_messages` matched on
`(customerId, milkmanId)`, with nothing representing the conversation itself.

So: **create a chat row for every customer at assignment.** Then "number of
chats = number of customers" is true in the data, and every `familyChatId ??
customerId` fallback — each one a place the two numbers can drift — disappears.

Members are never counted, never billed individually, never a separate stop.
`orderedBy` still records which person ordered, so a family can still see who
ordered what.

## Changes, in ship order

Each step is deployable on its own and leaves the app working.

### 1. Every customer gets a chat

Create a `family_chats` row whenever a customer is assigned a milkman. Five
call sites set `assignedMilkmanId`:

- [customerRoutes.ts:248](../server/customerRoutes.ts:248) — customer picks a milkman
- [groupRoutes.ts:60](../server/groupRoutes.ts:60), [:92](../server/groupRoutes.ts:92) — create / join a group (already makes a chat)
- [serviceRequestRoutes.ts:286](../server/serviceRequestRoutes.ts:286), [:385](../server/serviceRequestRoutes.ts:385) — service request accepted

Put it in one helper — `ensureHouseholdChat(customerId, milkmanId)` — and call
it from all five. Do not inline it five times; that is how the sixth call site
gets forgotten.

`chatName` = the customer's name. `chatCode` generated as today, which means
any solo customer can invite family later by sharing their code. No separate
"create a group" flow is needed and it can be retired afterwards.

### 2. Backfill existing customers

One-off script, dry-run first:

- For every customer with an `assignedMilkmanId` and no chat: create the chat
  and add them as an admin member.
- Tag their historic `chat_messages` and `orders` with that `familyChatId`.
- Log a per-customer summary of what would change and eyeball it before the
  real run.

**Do not merge or reissue bills that already exist.** Settle history as it
stands; households start clean from the changeover. Merging paid and unpaid
history across three people is where money goes missing.

### 3. One billing path

Delete the customer-grouped path. `generateAllMonthlyBills` iterates chats and
calls `generateGroupBill(chatId)` for each. After step 2 every customer has a
chat, so `generateMonthlyBill(milkmanId)` has no remaining callers and goes.

That removes the race in one move: one path, one grouping, no ordering
dependency between the cron and the group bill screen.

`billId IS NULL` stays exactly as it is — it is what makes re-runs and missed
crons safe, and it needs no change.

### 4. Counting and the delivery run

- Customer count → chats for this milkman, not `customers.length`.
- `GET /api/milkmen/customers` → returns households: chat id, name, address,
  member count.
- Delivery run groups today's order messages by chat, one card per household
  listing everything that door ordered. Accept and Delivered still act per
  order message, so ticks are unchanged.
- `GET /api/delivery/queue` counts stops by chat, so `stopsAhead` matches what
  the milkman actually walks.

### 5. Address

The household carries one delivery address, taken from the chat creator at
backfill and editable by the milkman. Today two members of one family can hold
different addresses for the same door.

## Decisions taken

- **Switching milkman → new chat.** The old chat holds billing history with the
  previous milkman and must not be re-pointed.
- **Leaving a household → orders stay.** They were delivered to that door and
  billed to that door. Do not extract them.
- **One household per customer per milkman.** Enforce it; membership of two
  chats with the same milkman makes billing arbitrary.
- **No `households` table.** `family_chats` already is one. A second concept
  meaning the same thing is how you end up with two customer counts that
  disagree — the exact problem being removed.

## Open questions

- A household with no members left: close the chat, or keep it for history?
  Leaning keep, marked inactive, since bills reference it.
- Should the milkman be able to merge two chats he can see are one family?
  Useful, but it moves billing history — leaving out of v1.

## Risks

- **The backfill touches money.** Dry run, take a database snapshot first, run
  it at a quiet hour.
- **Step 3 changes who gets billed.** Ship it immediately after a billing run,
  never just before one, so there is a full cycle to catch problems.
- **Rollback:** steps 1, 2, 4, 5 are additive and safe to leave in place.
  Step 3 is the one to revert if bills look wrong — restoring the old cron call
  brings back the previous behaviour.

## How we know it worked

- A three-member household shows as **one** customer, **one** stop, **one**
  bill for the month.
- A solo customer is unchanged in every visible way.
- The milkman's customer count equals the number of conversations in the
  Customers screen.
- Running the billing cron twice produces no second bill.
