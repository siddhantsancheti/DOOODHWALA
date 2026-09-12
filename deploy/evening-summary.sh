#!/bin/bash
# The day's money, at 21:00 IST.
#
# Separate from the morning digest on purpose: the morning one is "does
# anything need you", this one is "what happened and what do you owe". Mixing
# them would bury the second in the first.
#
# Silent on a day nothing was paid — a message saying "nothing happened" every
# night trains you to stop reading them, and the morning digest already covers
# anything that genuinely needs attention.

set -uo pipefail

APP_DIR="${APP_DIR:-/home/dooodhwala/DOOODHWALA}"
source "$APP_DIR/deploy/notify.sh"

DATABASE_URL="${DATABASE_URL:-$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | head -1 | cut -d= -f2-)}"
DATABASE_URL="${DATABASE_URL%\"}"
DATABASE_URL="${DATABASE_URL#\"}"

if [ -z "$DATABASE_URL" ]; then
    notify "DOOODHWALA evening: could not read DATABASE_URL"
    exit 1
fi

ROWS="$(psql "$DATABASE_URL" -At -F'|' -f "$APP_DIR/deploy/evening.sql" 2>&1)"
if [ $? -ne 0 ]; then
    notify "DOOODHWALA evening: query failed — $ROWS"
    exit 1
fi

# ROLLUP always emits its grand-total row, even over nothing — on a day with no
# payments that row comes back as TOTAL|0||||| and the output is not empty. So
# count the real rows instead: no dairyman lines means no money moved, and
# nothing is worth sending.
if [ "$(grep -c '|f$' <<< "$ROWS")" -eq 0 ]; then
    logger -t dooodhwala "evening summary: no bills paid today, nothing sent"
    exit 0
fi

TODAY="$(TZ=Asia/Kolkata date '+%d %b')"
MSG="DOOODHWALA — $TODAY"
TAIL=""

# No arithmetic here — every figure below is final as Postgres computed it, and
# "greater than zero" is a string test against a fixed-scale decimal, so the
# shell never has to add or compare money.
nonzero() { [ -n "$1" ] && [ "$1" != "0" ] && [ "$1" != "0.00" ]; }

while IFS='|' read -r WHO BILLS EARNED OWES_YOU YOU_OWE UNMATCHED IS_TOTAL; do
    [ -z "$WHO" ] && continue

    if [ "$IS_TOTAL" = "t" ]; then
        TAIL="Today: $BILLS bill(s), revenue Rs $EARNED"
        nonzero "$OWES_YOU" && TAIL="$TAIL"$'\n'"To collect from dairymen: Rs $OWES_YOU"
        nonzero "$YOU_OWE"  && TAIL="$TAIL"$'\n'"To send to dairymen: Rs $YOU_OWE"
        [ "${UNMATCHED:-0}" -gt 0 ] && TAIL="$TAIL"$'\n'"($UNMATCHED bill(s) unmatched — excluded from both figures)"
        continue
    fi

    MSG="$MSG"$'\n'$'\n'"$WHO — $BILLS bill(s), you earned Rs $EARNED"
    nonzero "$OWES_YOU" && MSG="$MSG"$'\n'"  holds the cash, owes you Rs $OWES_YOU"
    nonzero "$YOU_OWE"  && MSG="$MSG"$'\n'"  SEND HIM Rs $YOU_OWE"
    [ "${UNMATCHED:-0}" -gt 0 ] && MSG="$MSG"$'\n'"  $UNMATCHED bill(s) with no matched payment — direction unknown"
done <<< "$ROWS"

MSG="$MSG"$'\n'$'\n'"$TAIL"

notify "$MSG"
