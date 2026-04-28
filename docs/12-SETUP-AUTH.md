# 12 — Setup Auth (Supabase + Google Sign-In)

This doc covers the one-time setup needed to wire Supabase Auth and Google
Sign-In on Capacitor 8 / Android. Code changes are already in place
(`src/platform/supabase.ts`, `src/platform/google-auth.ts`,
`src/game/auth.ts`, settings menu Account section). What's left is the
external configuration on Google Cloud + Supabase, plus filling in the env
vars locally.

---

## 1. Supabase project

1. Go to https://app.supabase.com → New project (region close to your players;
   `eu-west-3` Paris is a good default for FR / EU traffic).
2. Once provisioned, copy **Project URL** and **anon public key** from
   Settings → API. They go into `.env`:

   ```dotenv
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

3. Auth → Providers → Google → toggle **Enabled**. Leave the field
   "Authorized Client IDs" blank for now — we'll fill it after step 2.

---

## 2. Google Cloud Console — OAuth 2.0 Client IDs

You need TWO client IDs in the same project: one for **Web** (used by both
Supabase and the JS bridge) and one for **Android** (used by the Capacitor
plugin natively).

1. https://console.cloud.google.com → New project (or pick existing).
2. APIs & Services → OAuth consent screen → External, app name "Vampire
   Maxxing", logo + support email. Add the scopes `openid`, `email`,
   `profile`.
3. APIs & Services → Credentials → **Create Credentials → OAuth client ID**:
   - **Web application** type. Name: "Vampire Maxxing — Web".
   - Authorized JavaScript origins: your dev origin (`http://localhost:5173`)
     and the Supabase callback (`https://<your-project>.supabase.co`).
   - Authorized redirect URIs: `https://<your-project>.supabase.co/auth/v1/callback`
   - Create → copy the **Client ID** (looks like
     `123456789012-abcdefghij.apps.googleusercontent.com`). This is your
     `VITE_GOOGLE_WEB_CLIENT_ID`.
4. **Create another OAuth client ID**:
   - **Android** type. Name: "Vampire Maxxing — Android".
   - Package name: `quest.kenny.vampiremaxxing`.
   - SHA-1 certificate fingerprint — there are TWO that matter once the
     app ships through Play Console:
     - **Play App Signing key** (Google's re-signing key for closed/prod
       tracks): `FF:F0:64:58:D8:14:02:27:87:0A:14:21:6F:5F:1E:52:4E:A1:3B:A4`
     - **Upload key** (your local release keystore that signs the AAB
       before upload): `11:F3:1B:B9:35:BE:C5:76:28:2B:59:20:ED:AC:74:71:7E:65:7F:4B`
     - Optional debug key for `apk:debug` installs: run
       `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1`
     - The OAuth client creation form only takes ONE SHA-1 — start with
       Play App Signing (mandatory for closed testing), then re-open the
       client and "Add fingerprint" for the upload + debug ones.
   - Create. The Android client doesn't have a downloadable secret — Google
     binds the app's package + SHA-1 to the OAuth client implicitly.

   > Where to find the Play App Signing SHA-1 in Play Console (FR UI):
   > **Tester et publier → Intégrité des applis** → click the "Signature
   > d'application" row to drill into the keymanagement page (or jump
   > directly via `/console/.../app/<app-id>/keymanagement`). Two
   > certificate blocks: "Certificat de la clé de signature de
   > l'application" (Play's key) and "Certificat de la clé d'importation"
   > (yours). Copy the SHA-1 from each.

---

## 3. Wire Supabase to the Web Client ID

Back in Supabase Auth → Providers → Google:
- Authorized Client IDs (comma-separated): paste the **Web** Client ID from
  step 2.3. This tells Supabase which audience to expect on the idToken.
- Save.

---

## 4. Fill in env vars

`.env` at repo root (gitignored):

```dotenv
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_GOOGLE_WEB_CLIENT_ID=123456789012-abcdefghij.apps.googleusercontent.com
```

`android/app/src/main/res/values/strings.xml`: replace
`REPLACE_WITH_GOOGLE_WEB_CLIENT_ID` with the same Web Client ID. The
Capacitor plugin reads this resource on Android.

---

## 5. Verify

```bash
npm run dev
```
Open the app → gear icon → settings panel. The **ACCOUNT** section should
appear above Privacy & Spending with a "SIGN IN WITH GOOGLE" button. Tap
it and complete the Google sheet — the row should flip to show your email
and a "SIGN OUT" action.

On Android:
```bash
npm run apk:debug && adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
Same flow. If sign-in silently fails on device:
- Confirm the SHA-1 of the keystore that signed the APK matches the one
  registered in the Android OAuth client.
- Check `adb logcat | grep -iE "googleauth|signin"` for the SDK error code
  (10 = developer error → wrong SHA-1 or wrong package name; 12500 =
  missing Google Play Services).

---

## 6. What's NOT done yet (next prompts)

- **DB schema + RLS** (next prompt): tables `players`, `player_state`,
  `gacha_pulls`, `purchases`, `daily_claims` with `auth.uid()` RLS.
- **Migration localStorage → cloud on first login**: hooks into
  `auth-changed` event, pushes the local snapshot once, then cloud
  becomes source of truth.
- **Edge function `gacha-pull`**: server-authoritative RNG.
- **Edge function `daily-claim`**: server-validated streak.
- **Edge function `validate-purchase`**: Play Billing receipt check.

This prompt's deliverable is **only** the auth handshake — login works,
session persists, but no data is read from or written to Supabase yet.
