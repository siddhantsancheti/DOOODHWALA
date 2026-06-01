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
> Daily milk & dairy delivery from your local dairyman — order, track, pay easily.

## Full description
> DOOODHWALA connects you with trusted local milk-delivery vendors for fresh daily dairy.
>
> • Find a nearby dairyman and place daily or recurring milk orders in a simple chat.
> • Set up subscriptions and auto-send your daily order at a time you choose.
> • Track your delivery live on the map and know exactly when it's arriving.
> • Get clear monthly bills and pay online via UPI, cards, or net banking — or choose Cash on Delivery with secure OTP confirmation.
> • Download bills and order receipts as PDFs.
> • Create a household group so your family shares one chat and one combined bill.
> • Chat with your dairyman, share photos, documents and your location.
>
> Simple, transparent, and built for everyday milk delivery.

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
