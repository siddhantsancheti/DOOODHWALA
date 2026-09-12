# Shared notifier. Sourced, not executed.
#
# Both the health check and the daily digest need to reach you the same way, so
# the webhook lives in one place — set ALERT_WEBHOOK once in .env and both use
# it. Without it everything still runs and writes to syslog; you just are not
# told, which is the situation this file exists to end.
#
#   Telegram: https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<ID>
#             (a trailing &text= is tolerated and trimmed — see below)
#   Discord/Slack: the channel webhook URL (JSON body)

_notify_dir="${APP_DIR:-/home/dooodhwala/DOOODHWALA}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-$(grep -E '^ALERT_WEBHOOK=' "$_notify_dir/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"')}"

notify() {
    local msg="$1"
    logger -t dooodhwala "$msg"
    echo "$msg"
    [ -z "${ALERT_WEBHOOK:-}" ] && return 0
    if [[ "$ALERT_WEBHOOK" == *"api.telegram.org"* ]]; then
        # curl adds its own url-encoded text= below, so a URL that already ends
        # in text= sends the parameter twice — Telegram reads the first, finds
        # it empty, and answers 400. Both spellings of the URL are in the wild
        # (the old comment here documented the trailing one), so accept either
        # and trim it rather than making everyone edit .env.
        local url="${ALERT_WEBHOOK%text=}"
        url="${url%[?&]}"
        curl -fsS --max-time 10 --get --data-urlencode "text=$msg" "$url" >/dev/null || true
    else
        local json
        json=$(printf '%s' "$msg" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')
        curl -fsS --max-time 10 -H 'Content-Type: application/json' \
             -d "{\"text\":$json,\"content\":$json}" "$ALERT_WEBHOOK" >/dev/null || true
    fi
}
