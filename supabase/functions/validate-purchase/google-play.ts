// Google Play Developer API — purchase token verification helper.
//
// Two-step OAuth: sign a service-account JWT locally with RS256, exchange
// it for an access_token at https://oauth2.googleapis.com/token, then call
// the Android Publisher API:
//
//   GET /androidpublisher/v3/applications/{packageName}
//       /purchases/products/{productId}
//       /tokens/{purchaseToken}
//
// Response state codes:
//   purchaseState     0 = purchased, 1 = cancelled/refunded, 2 = pending
//   acknowledgementState 0 = not yet ack'd, 1 = ack'd
//   consumptionState  0 = not yet consumed, 1 = consumed
//
// We accept only purchaseState=0 and reject the rest. The client is
// responsible for calling consume / acknowledge on Play Billing AFTER
// our validation succeeds (so we don't lose the entitlement on failure).

interface ServiceAccount {
  client_email: string;
  private_key: string;
  /** Optional — some JSONs include token_uri but we hardcode the standard endpoint. */
  token_uri?: string;
}

export interface PurchaseStatus {
  /** True iff Google says the purchase is in the "purchased" state. */
  isValid: boolean;
  /** Raw purchaseState code (0/1/2). null if API call failed. */
  purchaseState: number | null;
  /** Free-form error string for logging. null on success. */
  error: string | null;
}

/** Parse the SERVICE_ACCOUNT JSON env. Returns null when absent → caller
 *  drops into lax mode. */
export function parseServiceAccount(raw: string | undefined): ServiceAccount | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as ServiceAccount;
    if (!obj.client_email || !obj.private_key) return null;
    return obj;
  } catch {
    return null;
  }
}

/** Validate a purchase token via the Google Play Developer API. The
 *  `productId` is the SKU; `packageName` is the Android appId. Throws
 *  on auth failures. Network/4xx/5xx errors return isValid=false with
 *  the error string set. */
export async function verifyPurchaseWithGoogle(
  serviceAccount: ServiceAccount,
  packageName: string,
  productId: string,
  purchaseToken: string,
): Promise<PurchaseStatus> {
  let accessToken: string;
  try {
    accessToken = await getAccessToken(serviceAccount);
  } catch (e) {
    return {
      isValid: false,
      purchaseState: null,
      error: `oauth_failed: ${e instanceof Error ? e.message : 'unknown'}`,
    };
  }

  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(packageName)}/purchases/products/` +
    `${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    return {
      isValid: false,
      purchaseState: null,
      error: `http_${resp.status}`,
    };
  }
  const body = (await resp.json()) as { purchaseState?: number };
  const state = typeof body.purchaseState === 'number' ? body.purchaseState : null;
  return {
    isValid: state === 0,
    purchaseState: state,
    error: null,
  };
}

/** Sign a JWT with the service-account private key and exchange it for
 *  an access_token at the Google OAuth endpoint. */
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const encHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encClaim = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claim)));
  const signingInput = `${encHeader}.${encClaim}`;

  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!tokenResp.ok) {
    const text = await tokenResp.text().catch(() => '');
    throw new Error(`token endpoint ${tokenResp.status}: ${text.slice(0, 200)}`);
  }
  const tokenJson = (await tokenResp.json()) as { access_token?: string };
  if (!tokenJson.access_token) throw new Error('no access_token in response');
  return tokenJson.access_token;
}

/** Import a PEM-encoded RSA private key into a Web Crypto CryptoKey
 *  usable for RS256 signing. Strips header/footer + base64-decodes. */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/** Base64url encode (RFC 4648 §5) — no padding, +/ → -_. */
function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i += 1) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
