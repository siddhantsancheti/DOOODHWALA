#!/bin/bash
# One message a day with everything you would otherwise have to go and check.
#
# The point is not the numbers — it is that on a normal day the message says
# "nothing needs you", and you can go back to studying without opening the
# dashboard. Anything that does need you is named, with the count, so the
# decision to act takes seconds.
#
# Run by dooodhwala-digest.timer at 07:30 IST: after the morning round is
# underway, before a student's day starts.

set -uo pipefail

APP_DIR="${APP_DIR:-/home/dooodhwala/DOOODHWALA}"
BACKUP_DIR="${BACKUP_DIR:-/home/dooodhwala/backups}"

source "$APP_DIR/deploy/notify.sh"

DATABASE_URL="${DATABASE_URL:-$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | head -1 | cut -d= -f2-)}"
DATABASE_URL="${DATABASE_URL%\"}"
DATABASE_URL="${DATABASE_URL#\"}"

if [ -z "$DATABASE_URL" ]; then
    notify "DOOODHWALA digest: could not read DATABASE_URL — digest skipped"
    exit 1
fi

ROW="$(psql "$DATABASE_URL" -At -F'|' -f "$APP_DIR/deploy/digest.sql" 2>&1)"
if [ $? -ne 0 ] || [ -z "$ROW" ]; then
    notify "DOOODHWALA digest: database query failed — $ROW"
    exit 1
fi

IFS='|' read -r NO_ROLE MILKMAN_NO_PROFILE CUST_NO_DAIRYMAN KYC_PENDING \
                DELIVERED_YDAY ORDERS_YDAY BILLS_MONTH REVENUE <<< "$ROW"

# Backup freshness is a filesystem question, not a database one. A backup that
# silently stopped running looks identical to one that ran, until you need it.
NEWEST="$(ls -t "$BACKUP_DIR"/dooodhwala_*.sql.gz 2>/dev/null | head -1)"
if [ -n "$NEWEST" ]; then
    AGE_H=$(( ( $(date +%s) - $(stat -c%Y "$NEWEST") ) / 3600 ))
    BACKUP_LINE="Backup: ${AGE_H}h old, $(du -h "$NEWEST" | cut -f1)"
    [ "$AGE_H" -gt 30 ] && BACKUP_LINE="Backup: STALE — ${AGE_H}h since the last one"
else
    BACKUP_LINE="Backup: NONE FOUND in $BACKUP_DIR"
fi

# Everything that would make you open the dashboard, in one list. Built first so
# the message can lead with whether there is anything at all.
ACTIONS=()
[ "${NO_ROLE:-0}" -gt 0 ]             && ACTIONS+=("$NO_ROLE signed up but never picked customer or dairyman")
[ "${MILKMAN_NO_PROFILE:-0}" -gt 0 ]  && ACTIONS+=("$MILKMAN_NO_PROFILE dairyman account(s) with no profile — cannot take orders")
[ "${CUST_NO_DAIRYMAN:-0}" -gt 0 ]    && ACTIONS+=("$CUST_NO_DAIRYMAN customer(s) with no dairyman — cannot order anything")
[ "${KYC_PENDING:-0}" -gt 0 ]         && ACTIONS+=("$KYC_PENDING dairyman KYC awaiting your review — cannot be paid out")
[[ "$BACKUP_LINE" == *STALE* || "$BACKUP_LINE" == *NONE* ]] && ACTIONS+=("$BACKUP_LINE")

# Bills are generated at 00:30 on the 1st. Silence on the 2nd means it failed.
DOM="$(TZ=Asia/Kolkata date +%-d)"
if [ "$DOM" -ge 2 ] && [ "$DOM" -le 4 ] && [ "${BILLS_MONTH:-0}" -eq 0 ]; then
    ACTIONS+=("No bills generated this month — the 1st-of-month billing run did not produce anything")
fi

if [ ${#ACTIONS[@]} -eq 0 ]; then
    HEAD="DOOODHWALA — nothing needs you today."
else
    HEAD="DOOODHWALA — ${#ACTIONS[@]} thing(s) need you:"
    for a in "${ACTIONS[@]}"; do HEAD="$HEAD"$'\n'"  • $a"; done
fi

MSG="$HEAD

Yesterday: $ORDERS_YDAY order(s) placed, $DELIVERED_YDAY delivered
This month: $BILLS_MONTH bill(s) generated
Platform revenue, lifetime: Rs $REVENUE
$BACKUP_LINE"

notify "$MSG"
