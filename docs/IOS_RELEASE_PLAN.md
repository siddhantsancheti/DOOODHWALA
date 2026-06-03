# DOOODHWALA — iOS / App Store Release Plan

You do **not** need a Mac. iOS builds run in the cloud via **EAS Build** (Expo's hosted macOS). You build and submit from Windows.

---

## Phase 0 — What's already done ✅
- iOS bundle id `com.dooodhwala.app`, build number, EAS `production`/`preview` iOS profiles
- Info.plist permission strings (location "when in use", camera, photos, notifications)
- Associated domains, background location already removed (foreground-only — same as Android)
- EAS project exists (`siddhant_20`, projectId set)

## Phase 1 — Accounts & keys (YOU provide)
| Item | Why | Cost |
|---|---|---|
| **Apple Developer Program** | Signing, push, TestFlight, App Store | **$99/year** |
| **Firebase iOS app** | `@react-native-firebase` needs `GoogleService-Info.plist` | Free |
| **APNs Auth Key (.p8)** | Push notifications + Firebase Phone OTP on iOS | Free |

### Firebase iOS setup steps
1. Firebase console (`dooodhwala-7dce6`) → Add app → **iOS** → bundle `com.dooodhwala.app`.
2. Download **`GoogleService-Info.plist`** → place in `mobile-app/`.
3. Project Settings → Cloud Messaging → upload **APNs Auth Key (.p8)** (created in Apple Developer → Keys, enable APNs).
4. Note the `REVERSED_CLIENT_ID` from the plist (starts `com.googleusercontent.apps...`) — needed for the phone-auth URL scheme.

## Phase 2 — Code config (DONE by Claude, see commit)
- Installed **expo-build-properties**; added `ios.useFrameworks: "static"` (mandatory for react-native-firebase on iOS).
- Added **`@react-native-firebase/app`** to plugins.
- Set **`ios.googleServicesFile: "./GoogleService-Info.plist"`**.
- Added a placeholder for the phone-auth **URL scheme** (fill `REVERSED_CLIENT_ID` once you have the plist).

## Phase 3 — Build (EAS, no Mac)
```
cd C:\dw\mobile-app
eas login                       # if not already
eas build --platform ios --profile production
```
- First run: EAS asks to create/manage iOS **distribution certificate + provisioning profile** — let it (it uses your Apple account).
- It needs your **Apple ID + app-specific password** (or sign in via the prompt).
- Output: a `.ipa` in the cloud.

## Phase 4 — TestFlight + App Store
1. **App Store Connect** (appstoreconnect.apple.com) → create the app (same bundle id).
2. Submit the build:
   ```
   eas submit --platform ios --profile production
   ```
   (Fill real values in `eas.json` → submit.production.ios: `appleId`, `ascAppId`, `appleTeamId`.)
3. **TestFlight** → internal/external testers (Apple's beta — *no* 12-tester/14-day rule like Google).
4. **App Store listing**: screenshots (6.7" + 6.5" iPhone sizes), description (reuse Play copy), keywords, privacy policy URL (already hosted), **App Privacy** questionnaire (mirror the Data safety answers), age rating.
5. **Submit for review** → Apple review (typically 1–3 days).

## iOS-specific notes / gotchas
- **Phone OTP (Firebase)**: needs APNs key + the `REVERSED_CLIENT_ID` URL scheme + (fallback) reCAPTCHA. Without APNs, silent push verification fails and it falls back to reCAPTCHA webview.
- **Razorpay**: works on iOS via CocoaPods (EAS handles pods). UPI on iOS opens installed UPI apps (GPay/PhonePe iOS).
- **Mapbox**: needs `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` in EAS env (already configured for Android — same var works for iOS).
- **App Privacy (Apple)**: declare the same data as Google Data safety (phone, name, address, location, photos, messages, purchase history, identifiers). Mark "not used for tracking."
- **Sign in with Apple**: NOT required for you (you use phone OTP, not third-party social login), so no Apple-login mandate.

## Cost & time summary
- **$99/year** Apple Developer.
- EAS Build free tier works (slower queue); paid for priority.
- Timeline: ~1 day to set up Firebase iOS + certs, build, submit; +1–3 days Apple review.

---

## Open checklist
- [ ] Enrol Apple Developer Program ($99)
- [ ] Add iOS app in Firebase → download `GoogleService-Info.plist` → drop in `mobile-app/`
- [ ] Create APNs key, upload to Firebase
- [ ] Fill `REVERSED_CLIENT_ID` URL scheme in app.json
- [ ] `eas build --platform ios --profile production`
- [ ] Create app in App Store Connect, fill listing + App Privacy
- [ ] `eas submit` → TestFlight → submit for review
