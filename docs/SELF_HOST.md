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

## 1. Open the firewall (ports 80, 443)
On the server:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```
> On Oracle Cloud you ALSO must open 80/443 in the VCN **Security List / NSG**
> in the web console, or traffic is blocked before it reaches the VM.

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
Required: `DATABASE_URL, JWT_SECRET, FIREBASE_SERVICE_ACCOUNT, FIREBASE_STORAGE_BUCKET,
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET`.

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

## 7. Point the app + webhook at the new URL (NO app rebuild)
- **Supabase → Table Editor → `app_config`** → row `key = api_url` → set `value`
  to `https://api.dooodhwala.com`. Installed apps pick it up on next launch.
- **Razorpay → Webhooks** → edit URL to
  `https://api.dooodhwala.com/api/payments/razorpay/webhook` (keep the secret).

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
