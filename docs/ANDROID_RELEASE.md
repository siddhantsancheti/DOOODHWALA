# Android release runbook (Google Play)

How to build and ship a new Android version of DOOODHWALA to Google Play.
Written after a rough first production submission — the gotchas at the bottom
are already fixed in the repo, but documented so you know why the config looks
the way it does (and don't reintroduce them).

## TL;DR

```
git clone https://github.com/siddhantsancheti/DOOODHWALA.git
cd DOOODHWALA/mobile-app
npm install --legacy-peer-deps
# place the signing keystore + credentials.json (see "Signing")
# place google-services.json (see "Firebase")
eas build --platform android --profile production
# download the .aab, upload to Play Console -> Production
```

Always build from a **fresh clone of `main`** (all fixes live there). Old
desktop copies (`DOOODHWALA - Copy` at versionCode 22, `C:\dw`, etc.) are stale
— do not build from them.

## Prerequisites

- Node 18+ and `npm i -g eas-cli`, logged in via `eas login` (Expo account `siddhant_20`).
- Java JDK (only needed if you want to inspect the keystore with `keytool`).
- The **upload keystore** file and its password (see Signing).

## Signing (critical)

Play App Signing is enabled, so uploads must be signed with the app's **upload
key**:

- **SHA1:** `F0:88:C1:9C:1C:28:FB:2D:74:BC:54:10:3A:9C:A1:59:57:FD:7B:6C`
- **Alias:** `dooodhwala`
- **Keystore file:** `dooodhwala.keystore` (also backed up as `dooodhwala-UPLOAD-KEY-BACKUP.keystore`)
- **Password:** kept in your password manager — **not** in this repo. (Store and key passwords are the same for this keystore.)

> This keystore is the ONLY key that can update the app on Play. Back it up
> securely. If it is ever lost, you must request an upload-key reset from Google
> (1-2 business day wait) before you can publish again.

The production profile signs with a **local** keystore
(`eas.json` -> `production.credentialsSource: "local"`). Before building, create
these two files in `mobile-app/` (both are gitignored — never commit them):

1. `mobile-app/credentials/dooodhwala.keystore` — the keystore file.
2. `mobile-app/credentials.json`:

```json
{
  "android": {
    "keystore": {
      "keystorePath": "credentials/dooodhwala.keystore",
      "keystorePassword": "<from password manager>",
      "keyAlias": "dooodhwala",
      "keyPassword": "<from password manager>"
    }
  }
}
```

On Windows PowerShell, write `credentials.json` **without a BOM** (a UTF-8 BOM
makes EAS reject it as invalid JSON):

```powershell
$json = Get-Content some-source | Out-String   # or paste the JSON into $json
[System.IO.File]::WriteAllText("$PWD\credentials.json", $json)
```

## Firebase (Android)

`app.json` -> `android.googleServicesFile: "./google-services.json"`. That file
must exist in `mobile-app/` at build time (it is gitignored). Download it from
the Firebase console: project `dooodhwala-7dce6` -> Project settings -> Your apps
-> Android app `com.dooodhwala.app` -> `google-services.json`.

## Build

```
cd mobile-app
npm install --legacy-peer-deps
eas build --platform android --profile production
```

- `autoIncrement` bumps `versionCode` automatically (must exceed the highest
  version already on Play).
- At the credentials step it should print **"Using local Android credentials
  (credentials.json)"** and reuse the keystore above — it must NOT offer to
  generate a new keystore.
- Download the resulting `.aab` from the build page.

## Upload and submit

1. Play Console -> Test and release -> **Production** -> Create new release ->
   **Upload** the `.aab`.
2. Play policy scans **all tracks**. If older builds on Closed/Internal testing
   still trip a policy check (e.g. removed permissions), promote the same `.aab`
   to those tracks too, or the issue keeps flagging.
3. Complete **App content -> App access** (see below).
4. Publishing overview -> **Submit for review**. Managed publishing is ON, so
   nothing goes live until you press **Publish** after approval.

## App access (reviewer login)

The app is phone-OTP gated, so reviewers cannot receive a real SMS. A review
test account is wired into the backend, gated behind env vars:

- Server env: `REVIEW_TEST_PHONE` (a fixed phone number) and `REVIEW_TEST_OTP`
  (default `123456`). The bypass is inert unless `REVIEW_TEST_PHONE` is set —
  keep it set on the production backend.
- In Play Console -> App content -> App access, choose "restricted" and provide
  that phone number + OTP so reviewers can sign in.

## Gotchas already fixed (context)

These blocked the first submission. The fixes are committed; listed so you don't
undo them:

1. **No broad media/storage permissions.** `READ_MEDIA_IMAGES`,
   `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` are
   removed and listed under `app.json` -> `android.blockedPermissions`. Image
   picking uses the Android system photo picker (needs no permission). Do not
   re-add these permissions.
2. **Android Firebase file** must be present (see Firebase) or `expo prebuild`
   fails with "expo.android.googleServicesFile is not defined".
3. **Manifest merger fix.** `plugins/withFirebaseNotificationFix.js` adds
   `tools:replace` so expo-notifications and firebase-messaging don't collide on
   the Firebase notification meta-data.
4. **Local signing** with the correct upload key (see Signing) — the EAS-managed
   keystore signs with the wrong key and Play rejects it.
