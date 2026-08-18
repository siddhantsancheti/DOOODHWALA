# DOOODHWALA — Self-hosting the backend on a Linux server

Turnkey setup for an Ubuntu server (Oracle Cloud Always-Free VM, or any VPS).
Result: your Express + WebSocket backend running 24/7 behind HTTPS, auto-restart,
auto-renewing TLS. No PaaS, permanently free on Oracle's free tier.

Prereqs:
- An Ubuntu 22.04+ server with a public IP (Oracle Always-Free, Hetzner, DO…).
- A domain you control. Point an **A record** `api.dooodhwala.com → <server IP>`.
  (HTTPS needs a real domain — Razorpay/Firebase won't accept a bare IP.)
- SSH access to the server.

---

## 0. Oracle Cloud: pick the right shape

- **Ampere A1 (ARM), 4 OCPU / 24 GB** — take this one. The backend has no
  native modules, so ARM needs no special handling.
- **VM.Standard.E2.1.Micro (x86), 1 GB RAM** — `npm run build` runs Vite and
  can be OOM-killed at 1 GB. Add swap first:
  ```bash
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

> Always Free ARM instances can be reclaimed when idle. Upgrading the account
> to Pay As You Go keeps the free resources free and stops reclamation.

## 1. Open the firewall (ports 80, 443)

**Two firewalls must both allow traffic.** This is the single most common
reason an Oracle VM looks dead on port 80 — the console rule is open but the
VM still drops packets.

**(a) In the Oracle console:** VCN → Security List (or NSG) → add ingress
rules for TCP 80 and 443 from `0.0.0.0/0`.

**(b) On the VM itself.** Oracle's Ubuntu images ship iptables rules that
REJECT everything except SSH, and they persist across reboots. `ufw` sits in
front of them and does *not* clear them, so opening ports in ufw alone is not
enough:
```bash
# Check for the REJECT rule Oracle pre-installs
sudo iptables -L INPUT -n --line-numbers

# Allow 80/443 ahead of the reject, then persist
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 7 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```
(Insert *above* the existing REJECT line — check the numbers from the first
command; 6 and 7 are typical but not guaranteed.)

Then the usual ufw rules:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```
Do **not** open 5001. The app binds loopback only (`HOST=127.0.0.1` in the
systemd unit) and Caddy proxies to it.

## 2. Create a user + install Node 20 & Caddy
```bash
sudo adduser --disabled-password --gecos "" dooodhwala
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
# Caddy (auto-HTTPS reverse proxy)
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

## 3. Clone + build the app
```bash
sudo -iu dooodhwala
git clone https://github.com/siddhantsancheti/DOOODHWALA.git
cd DOOODHWALA
npm install
npm run build        # builds client + bundles server to dist/index.js
exit
```

## 4. Add secrets (.env)
```bash
sudo -iu dooodhwala
cd DOOODHWALA
cp .env.example .env
nano .env            # paste the REAL values (copy from your Render env)
chmod 600 .env
exit
```
Required: `DATABASE_URL, JWT_SECRET, FIREBASE_STORAGE_BUCKET,
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET`.

> **Do not put `FIREBASE_SERVICE_ACCOUNT` in `.env` here.** systemd's
> `EnvironmentFile` is not a shell — it mangles the embedded quotes and `\n`
> escapes in that JSON blob, and push notifications then fail silently with a
> parse error buried in the logs. Copy the service-account JSON to a file
> instead; the server already falls back to it and the systemd unit's
> `WorkingDirectory` makes the path resolve:
> ```bash
> # from your machine
> scp firebase-service-account.json dooodhwala@<server-ip>:/home/dooodhwala/DOOODHWALA/
> # on the server
> chmod 600 /home/dooodhwala/DOOODHWALA/firebase-service-account.json
> ```
> Confirm with `journalctl -u dooodhwala | grep FCM` — you want
> "Firebase Admin initialized successfully", not "No Firebase credentials found".

**`REVIEW_TEST_PHONE` and `REVIEW_TEST_OTP` must NOT be set.** They enable a
fixed-OTP login that bypasses real SMS. They exist for app-store review only.

## 5. Run it as a service (auto-restart, starts on boot)
```bash
sudo cp /home/dooodhwala/DOOODHWALA/deploy/dooodhwala.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now dooodhwala
sudo systemctl status dooodhwala     # should be "active (running)"
journalctl -u dooodhwala -f          # live logs
```

## 6. HTTPS via Caddy
```bash
sudo cp /home/dooodhwala/DOOODHWALA/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile       # set your real subdomain
sudo systemctl reload caddy
```
Caddy automatically fetches + renews a Let's Encrypt cert. Visit
`https://api.dooodhwala.com/healthz` (or any route) to confirm it serves.

## 7. Cut over (NO app rebuild needed)

The app reads its API base URL at launch from the Supabase `app_config` table
([queryClient.ts](../mobile-app/src/lib/queryClient.ts)), so moving hosts is a
row edit, not a Play Store release. The WebSocket URL is derived from the same
value, so chat and delivery ticks follow automatically.

**Cut over in this order — leave Render running throughout.**

1. **Smoke-test the new box first, before touching anything users depend on:**
   ```bash
   curl https://api.dooodhwala.com/healthz          # {"status":"ok"}
   curl https://api.dooodhwala.com/api/legal/terms/customer | head -c 100
   ```
2. **Point the webhooks at the new URL** (both providers — Stripe is easy to
   forget, and a missed payment webhook means a customer pays and the bill
   stays unpaid):
   - Razorpay → Webhooks → `https://api.dooodhwala.com/api/payments/razorpay/webhook`
   - Stripe → Developers → Webhooks → `https://api.dooodhwala.com/api/payments/stripe/webhook`

   Keep the existing signing secrets, and keep the old Render endpoints active
   until cutover is confirmed — a payment in flight may still hit them.
3. **Flip the app:** Supabase → Table Editor → `app_config` → row
   `key = api_url` → set `value` to `https://api.dooodhwala.com`.
4. **Verify on a real device:** force-quit the app, reopen it (the URL is read
   once at launch), then log in, send a chat message, and confirm the ticks
   move. Ticks moving proves both HTTP and WebSocket are going to the new box.
5. **Watch both servers for a day** before shutting Render down. Render's logs
   going quiet is your signal that every client has moved over.

**Rollback** is the same row: set `value` back to the Render URL and force-quit
the app. That is the whole reason to keep Render alive during cutover.

## 8. Deploying updates later
```bash
sudo -iu dooodhwala
cd DOOODHWALA && git pull && npm install && npm run build
exit
sudo systemctl restart dooodhwala
```

---

## Operations checklist
- **Backups:** the DB is on Supabase (managed) — fine. Back up `.env` securely.
- **Updates:** `sudo apt-get update && sudo apt-get upgrade` monthly.
- **Monitoring:** systemd auto-restarts on crash; add an uptime monitor
  (e.g., a free UptimeRobot ping on `/healthz`) so you know if it's down.
- **Security:** keep `.env` at `chmod 600`, disable password SSH (keys only),
  keep the firewall to 22/80/443 only.

## Trade-offs vs a PaaS
- ✅ Free forever (Oracle), full control, no cold starts.
- ⚠️ You own uptime, OS patching, and TLS renewal (Caddy automates TLS).
- For a payment app, monitor it — a down server = failed orders.

---

# Automated setup (recommended)

Everything below the manual walkthrough is automated. On a fresh Oracle Ubuntu
VM:

```bash
curl -fsSL https://raw.githubusercontent.com/siddhantsancheti/DOOODHWALA/main/deploy/setup.sh | sudo bash
```

Idempotent — re-run it any time. It sets the timezone to IST, opens both
firewall layers, installs Node/Caddy/postgresql-client, creates the app user,
clones the repo, adds swap on small shapes, installs every systemd unit, caps
journal size, and turns on unattended security updates.

It cannot do the three things only you hold: the secrets, the DNS record, and
the Oracle console Security List.

## What runs without you

| Unit | Cadence | Does |
|---|---|---|
| `dooodhwala.service` | always | The app. Restarts on crash and on reboot. |
| `dooodhwala-backup.timer` | daily 02:30 IST | `pg_dump`, gzip, verify, rotate at 14 days. |
| `dooodhwala-health.timer` | every 5 min | Hits `/healthz`; restarts once and alerts if wedged. |
| `unattended-upgrades` | daily | Security patches. |

`Restart=always` handles a crash. The health timer handles the case systemd
cannot see: the process alive but not answering — a hung loop, an exhausted
connection pool. That looks healthy to systemd and dead to your customers.

## Alerts

Put a webhook in `.env` and the health check will tell you when something
breaks and when it recovers:

```
ALERT_WEBHOOK=https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=
```

A Telegram bot takes two minutes via @BotFather and is free. Discord and Slack
channel webhooks also work.

**A box cannot tell you it is dead.** If the VM is off, or the network is gone,
nothing on it can alert. Add one external check — UptimeRobot's free tier
pings `https://your-domain/healthz` every 5 minutes and emails you. That is
the one piece that must live somewhere else.

## Two things that bite when the database is managed

**pg_dump must be at least as new as the server.** Ubuntu 22.04 ships
pg_dump 14; Supabase runs 17. The stock client refuses outright with
"aborting because of server version mismatch", so setup.sh installs
postgresql-client-17 from the PGDG repo instead.

**Use a session-capable connection string.** Supabase's transaction pooler
(port 6543) does not support what pg_dump needs. Use the session pooler or
direct connection (port 5432) for `DATABASE_URL`; it serves the app equally
well.

**Write `.env` on the server, or strip carriage returns.** A file created in
Notepad on Windows carries CRLF line endings, and the trailing `` becomes
part of every value — producing baffling errors like a database name that
"does not exist". Fix with:
```bash
sudo sed -i 's/$//' /home/dooodhwala/DOOODHWALA/.env
```

## Backups: what is actually protected

The backup verifies itself — non-empty, valid gzip, contains `CREATE TABLE` —
and exits non-zero otherwise, so a silently empty dump cannot accumulate for
months.

**A backup on the same VM as the database is not a backup.** It dies with the
box. Two things fix that:

1. If your database is managed (Supabase, Neon), the provider already keeps
   its own backups. Confirm the retention on your plan — that is your real
   safety net, and these dumps are a second, independent copy.
2. For an off-box copy, install `rclone`, configure a remote (Google Drive's
   free tier is enough for SQL dumps), and set in `.env`:
   ```
   BACKUP_REMOTE=gdrive:dooodhwala-backups
   ```

### Restore

```bash
gunzip -c /home/dooodhwala/backups/dooodhwala_YYYYMMDD_HHMMSS.sql.gz \
  | psql "$DATABASE_URL"
```

**Restore one backup into a scratch database before you need to.** An untested
backup is a guess. Do it once now, while nothing is on fire.

## Deploying an update

```bash
sudo -iu dooodhwala /home/dooodhwala/DOOODHWALA/deploy/update.sh
sudo systemctl restart dooodhwala
```

Backs up first, then pulls, installs, builds and migrates. It builds **before**
you restart, so a broken build leaves the running server untouched instead of
taking the app down while you debug.

## Checking on it

```bash
systemctl status dooodhwala              # running?
systemctl list-timers | grep dooodhwala  # when did the timers last fire?
journalctl -u dooodhwala -n 100          # app logs
journalctl -u dooodhwala-backup -n 20    # did last night's backup work?
ls -lh /home/dooodhwala/backups/         # are the files actually there
```

If you look at one thing weekly, make it that last line. Backups that stopped
running are the failure nobody notices until it matters.
