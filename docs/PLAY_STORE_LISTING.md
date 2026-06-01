# DOOODHWALA — Play Store Submission Pack

Copy-paste content and exact answers for the Play Console listing & policy forms.

---

## App details
- **App name:** DOOODHWALA
- **Package name:** `com.dooodhwala.app`
- **Default language:** English (India) — en-IN
- **Category:** Food & Drink (alt: Shopping)
- **Contact email:** support@dooodhwala.com
- **Phone:** +91 8087906174
- **Website:** https://dooodhwala.com (or your hosted docs URL)

## Policy URLs (host the files in /docs)
- **Privacy policy:** `<your-host>/privacy-policy.html`
- **Terms of service:** `<your-host>/terms.html`
- **Account/data deletion:** `<your-host>/account-deletion.html`

> Quick free hosting: enable **GitHub Pages** on the repo (Settings → Pages → Branch: `main`, Folder: `/docs`). URLs become
> `https://<your-gh-username>.github.io/<repo>/privacy-policy.html` etc.

---

## Short description (max 80 chars)
> Fresh milk at your door every morning — order from your local dairyman in seconds.

## Full description
> Remember when the milkman just knew your order? DOOODHWALA brings that back — only now it lives in your pocket.
>
> Find a trusted dairyman near you, send your order in a quick chat, and get fresh milk at your door every morning. No phone calls, no confusion, no "did he come today?"
>
> Here's what people love about it:
>
> Order the way you'd text a friend. Just tap your quantity and hit send. Want the same thing every day? Set it once and let it auto-send each morning at the time you pick.
>
> Know exactly when it's coming. Watch your delivery move on the map and see how far away it is — so you're not left wondering.
>
> No more month-end bill surprises. Your orders add up into one clear monthly bill you can see anytime. Pay online with UPI, card, or net banking, or keep it old-school with Cash on Delivery (with a quick OTP so everyone's on the same page). Need a copy? Download any bill or receipt as a PDF.
>
> Sort it out as a family. Create a household group so everyone orders into one chat and shares a single bill — no splitting hassles.
>
> Stay in touch. Chat with your dairyman, send a photo or a note, or drop your location so they find you the first time.
>
> Simple, honest, and built for the little daily ritual that keeps your mornings running. Welcome to your DOOODHWALA.

---

## Data Safety form answers
**Does your app collect or share user data?** Yes.

**Is data encrypted in transit?** Yes (HTTPS/TLS).
**Can users request data deletion?** Yes — in-app (Profile → Delete Account) and via the account-deletion URL.

| Data type | Collected | Shared | Purpose | Optional? |
|---|---|---|---|---|
| Phone number | Yes | Yes (to dairyman) | Account management, app functionality | Required |
| Name | Yes | Yes (to dairyman) | App functionality | Required |
| Address | Yes | Yes (to dairyman) | App functionality (delivery) | Required |
| Precise location | Yes | No | App functionality (nearby dairymen, live delivery tracking) | Optional |
| Photos | Yes | Yes (chat recipient) | App functionality (profile, chat) | Optional |
| Files/docs (chat) | Yes | Yes (chat recipient) | App functionality (chat) | Optional |
| Messages (in-app chat) | Yes | Yes (chat recipient) | App functionality | Required for chat |
| Purchase/payment info | Yes (reference only) | Yes (Razorpay) | App functionality (payments) | Required for online pay |
| App activity / orders | Yes | No | App functionality, analytics | Required |
| Crash logs / diagnostics | Yes | No | Analytics, app stability | — |
| Device IDs (FCM token) | Yes | No | Push notifications | — |

> Note: Full card/UPI credentials are NOT collected by us — handled by Razorpay.
> We do NOT use data for third-party advertising and do NOT sell data.

---

## Content rating questionnaire (IARC)
- App category: **Utility / Productivity / Communication** (or Reference).
- Violence / sexual / profanity / drugs: **No** to all.
- User-to-user communication / sharing: **Yes** (in-app chat between customer & dairyman).
- Shares user location with other users: **Yes** (delivery tracking — dairyman sees address/location for active orders).
- Digital purchases: **Yes** (pay bills online).
- Expected rating: everyone / 3+.

---

## Permissions justification (if asked)
- **Location (incl. background):** show nearby dairymen and provide live delivery tracking for active orders. Background location updates delivery progress only while an order is active.
- **Camera / Photos:** profile picture and sharing photos in chat.
- **Notifications:** order, delivery and billing alerts.

---

## Pre-launch checklist
- [ ] Pay $25, create app in Play Console.
- [ ] Host /docs files; paste the 3 policy URLs.
- [ ] Upload `DOOODHWALA-playstore.aab` to **Internal testing**.
- [ ] After Play App Signing enrolls: copy **SHA-1 + SHA-256** from Setup → App signing → add both to **Firebase** (`dooodhwala-7dce6`).  ⚠️ Or phone OTP login breaks on Play installs.
- [ ] Fill store listing, data safety, content rating.
- [ ] Add yourself as a tester; verify OTP login + payment + delivery tracking from a Play-installed build.
- [ ] Move Render to a paid plan + Supabase Pro before Production.
- [ ] Promote to Production.
