/**
 * Backfill: give every assigned customer a household chat.
 *
 *   npx tsx scripts/backfill-households.ts            # dry run, changes nothing
 *   npx tsx scripts/backfill-households.ts --apply    # actually write
 *
 * Step 2 of docs/HOUSEHOLD_MODEL.md. Read the dry-run output before applying,
 * and take a database snapshot first — this touches data that bills are
 * generated from.
 *
 * What it does NOT do: merge or reissue bills that already exist. Existing
 * bills are settled as they stand and households start clean from here.
 * Reconciling paid and unpaid history across several people is where money
 * goes missing.
 */
import "dotenv/config";
import { db } from "../server/db";
import { customers, familyChats, familyChatMembers, chatMessages } from "@shared/schema";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { ensureHouseholdChat } from "../server/services/households";

const APPLY = process.argv.includes("--apply");

async function main() {
    console.log(APPLY ? "APPLYING CHANGES" : "DRY RUN — nothing will be written");
    console.log("─".repeat(60));

    const assigned = await db
        .select({
            id: customers.id,
            userId: customers.userId,
            name: customers.name,
            milkmanId: customers.assignedMilkmanId,
        })
        .from(customers)
        .where(isNotNull(customers.assignedMilkmanId));

    console.log(`${assigned.length} assigned customer(s).\n`);

    let created = 0, already = 0, skipped = 0, tagged = 0;

    for (const customer of assigned) {
        const milkmanId = customer.milkmanId!;

        if (!customer.userId) {
            console.log(`SKIP  #${customer.id} ${customer.name ?? "(no name)"} — no user account`);
            skipped++;
            continue;
        }

        const existing = await db
            .select({ chatId: familyChats.id, name: familyChats.chatName })
            .from(familyChatMembers)
            .innerJoin(familyChats, eq(familyChatMembers.chatId, familyChats.id))
            .where(and(
                eq(familyChatMembers.userId, customer.userId),
                eq(familyChats.milkmanId, milkmanId),
                eq(familyChats.isActive, true),
            ))
            .limit(1);

        let chatId: number | null = existing[0]?.chatId ?? null;

        if (chatId) {
            console.log(`HAVE  #${customer.id} ${customer.name ?? ""} → chat ${chatId} (${existing[0].name})`);
            already++;
        } else if (APPLY) {
            chatId = await ensureHouseholdChat(customer.id, milkmanId);
            console.log(`NEW   #${customer.id} ${customer.name ?? ""} → chat ${chatId}`);
            created++;
        } else {
            console.log(`NEW   #${customer.id} ${customer.name ?? ""} → would create household`);
            created++;
            continue; // nothing to tag without a chat id
        }

        if (!chatId) continue;

        // Point this customer's untagged history at their household, so bills
        // grouped by chat see the orders they already placed.
        const untagged = await db
            .select({ id: chatMessages.id })
            .from(chatMessages)
            .where(and(
                eq(chatMessages.customerId, customer.id),
                eq(chatMessages.milkmanId, milkmanId),
                isNull(chatMessages.familyChatId),
            ));

        if (untagged.length > 0) {
            if (APPLY) {
                await db
                    .update(chatMessages)
                    .set({ familyChatId: chatId })
                    .where(and(
                        eq(chatMessages.customerId, customer.id),
                        eq(chatMessages.milkmanId, milkmanId),
                        isNull(chatMessages.familyChatId),
                    ));
            }
            console.log(`      ${APPLY ? "tagged" : "would tag"} ${untagged.length} message(s)`);
            tagged += untagged.length;
        }
    }

    console.log("\n" + "─".repeat(60));
    console.log(`households created : ${created}`);
    console.log(`already had one    : ${already}`);
    console.log(`skipped            : ${skipped}`);
    console.log(`messages tagged    : ${tagged}`);
    if (!APPLY) console.log("\nDry run. Re-run with --apply to write.");
    process.exit(0);
}

main().catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
});
