#!/bin/bash
# One-shot provisioning for a fresh Oracle Cloud Ubuntu VM.
#
#   curl -fsSL https://raw.githubusercontent.com/siddhantsancheti/DOOODHWALA/main/deploy/setup.sh | sudo bash
#
# Or, from a clone:  sudo bash deploy/setup.sh
#
# Idempotent — safe to re-run. It does everything except hand over secrets,
# which only you have: .env, the Firebase service account, and the domain's
# DNS record.
#
# See docs/SELF_HOST.md for the manual walkthrough of what this automates.

set -euo pipefail

APP_USER="dooodhwala"
APP_DIR="/home/$APP_USER/DOOODHWALA"
REPO="https://github.com/siddhantsancheti/DOOODHWALA.git"

[ "$EUID" -eq 0 ] || { echo "Run with sudo."; exit 1; }

step() { echo; echo "==> $*"; }

step "Timezone → Asia/Kolkata"
# The billing and subscription crons are written in IST. On a UTC box the
# monthly bill would fire at 05:30 IST on the 1st instead of midnight.
timedatectl set-timezone Asia/Kolkata

step "Firewall"
# Oracle's Ubuntu images ship iptables rules that REJECT everything except
# SSH, and ufw does not clear them. Both layers have to allow 80/443, and the
# Security List in the Oracle console is a third layer you must open by hand.
if ! iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null; then
    iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
    iptables -I INPUT 7 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
    command -v netfilter-persistent >/dev/null && netfilter-persistent save || true
fi
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 80 >/dev/null 2>&1 || true
ufw allow 443 >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true
echo "Local firewall open on 22/80/443. Port 5001 stays closed — Caddy proxies to it."

step "Packages"
# Ubuntu runs its own unattended-upgrades on boot and holds the apt lock. Wait
# for it rather than failing — on a fresh VM this script is usually run within
# minutes of first boot, which is exactly when that job is active.
for i in $(seq 1 60); do
    if fuser /var/lib/apt/lists/lock /var/lib/dpkg/lock-frontend >/dev/null 2>&1; then
        [ "$i" = 1 ] && echo "Waiting for Ubuntu's background updater to finish..."
        sleep 10
    else
        break
    fi
done
apt-get update -qq
apt-get install -y -qq curl git gnupg lsb-release ca-certificates unattended-upgrades >/dev/null

# Postgres client from the PGDG repo, not Ubuntu's. Ubuntu 22.04 ships
# pg_dump 14, and pg_dump refuses to dump a server newer than itself — managed
# Postgres (Supabase, Neon) is well past 14, so the stock client cannot back up
# the database at all.
if ! pg_dump --version 2>/dev/null | grep -qE ' 1[7-9]| 2[0-9]'; then
    install -d /usr/share/postgresql-common/pgdg
    curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc         https://www.postgresql.org/media/keys/ACCC4CF8.asc
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main"         > /etc/apt/sources.list.d/pgdg.list
    apt-get update -qq
    apt-get install -y -qq postgresql-client-17 >/dev/null
fi
if ! command -v node >/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
    apt-get install -y -qq nodejs >/dev/null
fi
if ! command -v caddy >/dev/null; then
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https >/dev/null
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
        | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
        > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq && apt-get install -y -qq caddy >/dev/null
fi
echo "node $(node -v), caddy $(caddy version | head -1)"

step "Security updates apply themselves"
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true

step "App user and checkout"
id -u "$APP_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$APP_USER"
if [ ! -d "$APP_DIR/.git" ]; then
    sudo -u "$APP_USER" git clone "$REPO" "$APP_DIR"
else
    sudo -u "$APP_USER" git -C "$APP_DIR" fetch origin
    sudo -u "$APP_USER" git -C "$APP_DIR" checkout main
    sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only origin main
fi
chmod +x "$APP_DIR"/deploy/*.sh

step "Swap (only if under 2 GB RAM)"
# The Vite build gets OOM-killed on the 1 GB x86 micro shape.
if [ ! -f /swapfile ] && [ "$(free -m | awk '/^Mem:/{print $2}')" -lt 2048 ]; then
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "2 GB swap added"
else
    echo "not needed"
fi

step "systemd units"
cp "$APP_DIR"/deploy/dooodhwala.service        /etc/systemd/system/
cp "$APP_DIR"/deploy/dooodhwala-backup.service /etc/systemd/system/
cp "$APP_DIR"/deploy/dooodhwala-backup.timer   /etc/systemd/system/
cp "$APP_DIR"/deploy/dooodhwala-health.service /etc/systemd/system/
cp "$APP_DIR"/deploy/dooodhwala-health.timer   /etc/systemd/system/
systemctl daemon-reload
systemctl enable dooodhwala-backup.timer dooodhwala-health.timer >/dev/null
systemctl start  dooodhwala-backup.timer dooodhwala-health.timer
echo "backup timer (daily 02:30) and health timer (every 5 min) enabled"

step "Journald size cap"
# Uncapped logs will eventually fill the boot volume, and a full disk looks
# exactly like a mystery outage.
mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=500M\n' > /etc/systemd/journald.conf.d/size.conf
systemctl restart systemd-journald

cat <<DONE

────────────────────────────────────────────────────────────
Provisioned. Three things only you can do:

1. Secrets — copy into $APP_DIR:
     .env                            (chmod 600; DATABASE_URL, JWT_SECRET,
                                      Razorpay/Stripe keys, ALERT_WEBHOOK)
     firebase-service-account.json   (chmod 600)
   Do NOT put FIREBASE_SERVICE_ACCOUNT in .env — systemd mangles the JSON.

2. Domain — point an A record at $(curl -fsS ifconfig.me 2>/dev/null || echo '<this IP>')
   then set it in /etc/caddy/Caddyfile:
     cp $APP_DIR/deploy/Caddyfile /etc/caddy/Caddyfile
     nano /etc/caddy/Caddyfile        # replace api.dooodhwala.com
     systemctl reload caddy

3. Oracle console — VCN → Security List → allow ingress TCP 80 and 443.
   The VM firewall is already open; this is the layer above it.

Then build and start:
     sudo -iu $APP_USER $APP_DIR/deploy/update.sh
     sudo systemctl enable --now dooodhwala
     curl https://YOUR-DOMAIN/healthz

Verify the automation actually runs:
     sudo systemctl start dooodhwala-backup.service   # force a backup now
     ls -lh /home/$APP_USER/backups/
     systemctl list-timers | grep dooodhwala
────────────────────────────────────────────────────────────
DONE
