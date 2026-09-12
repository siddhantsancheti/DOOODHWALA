#!/bin/bash
# Every 5 minutes: is the app actually answering? If not, restart it once and
# tell someone.
#
# systemd's Restart=always covers a crash. It does not cover the app still
# running but wedged — a hung event loop, an exhausted database pool, a
# deadlock. Those look alive to systemd and dead to your customers, and at
# 6am on a delivery round nobody is watching a dashboard.
#
# Set ALERT_WEBHOOK in /home/dooodhwala/DOOODHWALA/.env to get told:
#   Telegram: https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<ID>&text=
#   Discord/Slack: the channel webhook URL (JSON body)

set -uo pipefail

APP_DIR="${APP_DIR:-/home/dooodhwala/DOOODHWALA}"
URL="${HEALTH_URL:-http://127.0.0.1:5001/healthz}"
STATE="/tmp/dooodhwala-health.state"

source "$APP_DIR/deploy/notify.sh"

if curl -fsS --max-time 10 "$URL" | grep -q '"status"'; then
    # Recovered since the last check? Say so, so an alert always has an
    # all-clear and you are never left wondering.
    if [ -f "$STATE" ]; then
        rm -f "$STATE"
        notify "DOOODHWALA: back up and answering on $(hostname)"
    fi
    exit 0
fi

# Failing. Restart once per incident, not every five minutes — a restart loop
# on a genuinely broken build turns one outage into a flapping one.
if [ -f "$STATE" ]; then
    notify "DOOODHWALA: STILL DOWN on $(hostname) after restart. Needs a human. Check: journalctl -u dooodhwala -n 100"
    exit 1
fi

date > "$STATE"
notify "DOOODHWALA: health check failed on $(hostname) — restarting"
systemctl restart dooodhwala
sleep 15

if curl -fsS --max-time 10 "$URL" | grep -q '"status"'; then
    rm -f "$STATE"
    notify "DOOODHWALA: restart fixed it, service is answering again"
    exit 0
fi

notify "DOOODHWALA: restart did NOT fix it. Check: journalctl -u dooodhwala -n 100"
exit 1
