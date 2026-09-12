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

if [ -z "$ROWS" ]; then
    logger -t dooodhwala "evening summary: no bills paid today, nothing sent"
    exit 0
fi

TODAY="$(TZ=Asia/Kolkata date '+%d %b')"
MSG="DOOODHWALA — $TODAY"
TOTAL_EARNED=0; TOTAL_OWED_TO_YOU=0; TOTAL_YOU_OWE=0; TOTAL_UNMATCHED=0

while IFS='|' read -r WHO BILLS EARNED OWES_YOU YOU_OWE UNMATCHED; do
    [ -z "$WHO" ] && continue
    MSG="$MSG"$'\n'$'\n'"$WHO — $BILLS bill(s), you earned Rs $EARNED"
    [ "$(echo "$OWES_YOU > 0" | bc -l)" = "1" ] && MSG="$MSG"$'\n'"  collects cash, owes you Rs $OWES_YOU"
    [ "$(echo "$YOU_OWE > 0"  | bc -l)" = "1" ] && MSG="$MSG"$'\n'"  SEND HIM Rs $YOU_OWE"
    [ "${UNMATCHED:-0}" -gt 0 ] && MSG="$MSG"$'\n'"  $UNMATCHED bill(s) with no matched payment — direction unknown"

    TOTAL_EARNED=$(echo "$TOTAL_EARNED + $EARNED" | bc)
    TOTAL_OWED_TO_YOU=$(echo "$TOTAL_OWED_TO_YOU + $OWES_YOU" | bc)
    TOTAL_YOU_OWE=$(echo "$TOTAL_YOU_OWE + $YOU_OWE" | bc)
    TOTAL_UNMATCHED=$(( TOTAL_UNMATCHED + ${UNMATCHED:-0} ))
done <<< "$ROWS"

MSG="$MSG"$'\n'$'\n'"Today's revenue: Rs $TOTAL_EARNED
To collect from dairymen: Rs $TOTAL_OWED_TO_YOU
To send to dairymen: Rs $TOTAL_YOU_OWE"

[ "$TOTAL_UNMATCHED" -gt 0 ] && MSG="$MSG"$'\n'"($TOTAL_UNMATCHED bill(s) unmatched — figures above exclude them)"

notify "$MSG"
