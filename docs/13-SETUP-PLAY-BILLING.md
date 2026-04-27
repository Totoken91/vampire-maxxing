# 13 — Setup Play Billing (server validation)

The `validate-purchase` edge function ships in **lax mode** by default —
it inserts the purchase row, patches state_blob, but doesn't independently
verify the receipt with Google. That's safe for **closed testing** because
Play Billing only honours signed APKs from your Play Console, but is
**NOT safe for production** since a tampered APK could submit fake tokens.

This doc walks through promoting the function to **strict mode** by
configuring a Google service account that calls the Android Publisher API
on every purchase.

---

## 1. Create a service account

1. Go to https://console.cloud.google.com → APIs & Services → Library →
   search **Google Play Android Developer API** → Enable.
2. APIs & Services → Credentials → **Create credentials → Service account**:
   - Name: `vampire-maxxing-billing`
   - Role: leave blank (Play Console grants the role separately).
   - Skip "Grant users access".
3. Click the new service account → **Keys → Add Key → Create new key →
   JSON**. A JSON file downloads with `client_email`, `private_key`, etc.
   Treat it like a password.

## 2. Link the service account in Play Console

1. https://play.google.com/console → Setup → API access.
2. Find your `Vampire Maxxing` project linked to the GCP project. If it
   isn't, link it first.
3. Under "Service accounts" find the new service account. Click **Grant
   access**.
4. **Permissions → Account permissions**:
   - View financial data, orders, and cancellation survey responses ✅
5. **Permissions → App permissions** → Add `Vampire Maxxing` → check
   **View financial data, orders, and cancellation survey responses** ✅
6. Save changes.

Note: Google sometimes takes ~1h to propagate the grant. If your edge
function returns `validation_failed` right after linking, wait and retry.

## 3. Set the service account as a Supabase secret

The edge function reads `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` from Deno env.
The simplest way to set it is via the Supabase Dashboard:

1. https://supabase.com/dashboard/project/fpvzmobhvetufzbhmnqf/functions/secrets
2. Add new secret:
   - Name: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
   - Value: paste the **entire contents** of the JSON file from step 1
     (single-line minified is fine; the function parses with JSON.parse).
3. Save. Edge functions pick the new env up on the next cold start
   (next invocation).

Optionally also set `ANDROID_PACKAGE_NAME` if you ever change the
appId — it defaults to `quest.kenny.vampiremaxxing` if unset.

## 4. Verify strict mode is on

After setting the secret:

```bash
# Make a real test purchase from the closed-testing track. The
# validate-purchase response should now include "validated": true.
```

Or check the logs after a real test purchase:

1. https://supabase.com/dashboard/project/fpvzmobhvetufzbhmnqf/functions/validate-purchase/logs
2. Look for the request — successful runs log nothing extra; failures
   log the `error` field of the response.

The `purchases` row's `validated_at` column is also populated only in
strict mode; it stays NULL while running in lax mode.

## 5. What strict mode protects against

| Threat | Lax mode | Strict mode |
|---|---|---|
| Replay a captured purchase token | Blocked by `purchases.order_id` unique constraint | Blocked + Google rejects already-consumed token |
| Submit a hand-crafted purchase token | Accepts (no validation) | **Rejected** — Google says no record |
| Submit a refunded purchase token | Accepts | **Rejected** — purchaseState != 0 |
| Tampered APK with stubbed billing flow | Accepts | **Rejected** — Google says no record |
| Sandbox/test purchases hitting prod | Accepts | **Rejected** unless tester is on test track |

Lax mode is fine while testing on the closed track because the threat
model assumes only your invited testers have signed APKs. Once you go
public production, **strict mode is mandatory**.

## 6. Operational notes

- The service account JSON is a real secret. Don't commit it. Don't
  paste it in slack. Rotate via "Add Key" in GCP if leaked.
- The edge function regenerates the access_token per request. ~150ms
  overhead per validation. If purchase volume becomes a hot path,
  consider caching the token in a Deno KV store (60min lifetime).
- If the Android Publisher API call fails (5xx, network), the function
  returns `validation_failed_noresp` with status 402 and does NOT
  insert the purchase row. The client can retry — the same order_id
  will idempotency-replay if the function eventually succeeds.
