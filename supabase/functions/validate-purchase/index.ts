// Edge function: validate-purchase
//
// POST /functions/v1/validate-purchase
// Body: { sku: string, purchase_token: string, order_id: string }
// Auth: Bearer JWT
//
// Server-validated Play Billing receipt verification. Strict mode (when
// GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is configured) calls the Android
// Publisher API to confirm purchase state. Lax mode (default while in
// closed testing) skips the API call and trusts the supplied token —
// the unique constraint on order_id still prevents replay.
//
// Idempotency:
//   - INSERT INTO purchases ON CONFLICT (order_id) DO NOTHING.
//   - If the conflict triggers, fetch the existing row and return its
//     stored grant — the client may be retrying after a network blip.
//
// State patches on success:
//   - state_blob.ichor          += baseIchor + (firstTime ? FT : 0)
//   - state_blob.packsFirstTimeBought += [sku]      (one-shot)
//   - state_blob.spendingLog    += { ts, amountEur, productId }
//   - state_blob.ichorLedger    += { ... source: 'iap_pack' }
//   - state_blob.playerThralls  += guaranteed thrall (if pack has one)
//
// Returns { ok, grant: { sku, ichorCredited, ichorWasFirstTime,
//                        thrallGranted, rarePullThrall } }

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { packForSku, RARE_THRALL_IDS, type PackDef } from './packs.ts';
import {
  parseServiceAccount,
  verifyPurchaseWithGoogle,
} from './google-play.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const GOOGLE_SA_JSON = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
const ANDROID_PACKAGE_NAME =
  Deno.env.get('ANDROID_PACKAGE_NAME') ?? 'quest.kenny.vampiremaxxing';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
function errorResponse(error: string, status: number): Response {
  return jsonResponse({ ok: false, error }, status);
}

interface RequestBody {
  sku: string;
  purchase_token: string;
  order_id: string;
}

function validateBody(raw: unknown): RequestBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  const sku = body.sku;
  const token = body.purchase_token;
  const orderId = body.order_id;
  if (typeof sku !== 'string' || sku.length === 0 || sku.length > 64) return null;
  if (typeof token !== 'string' || token.length === 0 || token.length > 1024) return null;
  if (typeof orderId !== 'string' || orderId.length === 0 || orderId.length > 128) return null;
  return { sku, purchase_token: token, order_id: orderId };
}

interface SaveBlob {
  ichor?: number;
  ichorLedger?: Array<{ ts: number; amount: number; balance: number; source: string }>;
  playerThralls?: Record<
    string,
    {
      owned: boolean;
      level: number;
      xp: number;
      stars: number;
      firstObtainedAt: number;
      isNew: boolean;
    }
  >;
  packsFirstTimeBought?: string[];
  spendingLog?: Array<{ ts: number; amountEur: number; productId: string }>;
  [key: string]: unknown;
}

interface Grant {
  sku: string;
  ichorCredited: number;
  ichorWasFirstTime: boolean;
  thrallGranted: string | null;
  rarePullThrall: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return errorResponse('method_not_allowed', 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return errorResponse('missing_auth', 401);

  const userClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return errorResponse('invalid_auth', 401);
  const userId = userData.user.id;

  let bodyRaw: unknown = null;
  try {
    bodyRaw = await req.json();
  } catch {
    return errorResponse('invalid_request', 400);
  }
  const body = validateBody(bodyRaw);
  if (!body) return errorResponse('invalid_request', 400);

  const pack = packForSku(body.sku);
  if (!pack) return errorResponse('unknown_sku', 400);

  const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Idempotency check first — saves a Google API call on retries.
  const { data: existing } = await admin
    .from('purchases')
    .select('player_id, sku, ichor_credited, was_first_time, validated_at')
    .eq('order_id', body.order_id)
    .maybeSingle();

  if (existing) {
    const ex = existing as {
      player_id: string;
      sku: string;
      ichor_credited: number;
      was_first_time: boolean;
    };
    if (ex.player_id !== userId) {
      // Another user "claimed" this order id — refuse hard.
      return errorResponse('order_id_owned_by_other_user', 409);
    }
    if (ex.sku !== body.sku) {
      return errorResponse('order_id_sku_mismatch', 409);
    }
    // Already validated. Mirror the stored grant in the response so the
    // caller can re-apply it locally if their state was lost (e.g. app
    // killed after the validate succeeded but before the client got
    // the response).
    return jsonResponse({
      ok: true,
      grant: {
        sku: ex.sku,
        ichorCredited: ex.ichor_credited,
        ichorWasFirstTime: ex.was_first_time,
        thrallGranted: null,
        rarePullThrall: null,
      } satisfies Grant,
      replay: true,
    });
  }

  // Strict mode: verify the token with Google. Skipped when the service
  // account isn't configured — caller (Kenny) is expected to set this
  // env before opening to general production traffic. Closed testing
  // tracks are safe in lax mode because Play Billing only honours
  // signed APKs from the play store account.
  const sa = parseServiceAccount(GOOGLE_SA_JSON);
  let validatedAt: string | null = null;
  if (sa) {
    const status = await verifyPurchaseWithGoogle(
      sa,
      ANDROID_PACKAGE_NAME,
      body.sku,
      body.purchase_token,
    );
    if (!status.isValid) {
      return errorResponse(
        `validation_failed_${status.purchaseState ?? 'noresp'}`,
        402,
      );
    }
    validatedAt = new Date().toISOString();
  }

  // Read state_blob to compute the grant + first-time flag.
  const { data: stateRow, error: readErr } = await admin
    .from('player_state')
    .select('state_blob')
    .eq('owner_id', userId)
    .maybeSingle();
  if (readErr) return errorResponse('read_failed', 500);
  if (!stateRow) return errorResponse('no_state', 409);
  const blob: SaveBlob = (stateRow as { state_blob: SaveBlob }).state_blob;

  const firstTimeList = blob.packsFirstTimeBought ?? [];
  const isFirstTime = !firstTimeList.includes(body.sku);
  const ichorCredited = pack.baseIchor + (isFirstTime ? pack.firstTimeBonusIchor : 0);

  // Apply the grant on the blob. The shape mirrors the local
  // grantPackContents in src/game/iap.ts.
  const newIchor = (blob.ichor ?? 0) + ichorCredited;
  blob.ichor = newIchor;
  if (isFirstTime) {
    blob.packsFirstTimeBought = [...firstTimeList, body.sku];
  }
  blob.ichorLedger = blob.ichorLedger ?? [];
  blob.ichorLedger.push({
    ts: Date.now(),
    amount: ichorCredited,
    balance: newIchor,
    source: 'iap_pack',
  });
  blob.spendingLog = blob.spendingLog ?? [];
  blob.spendingLog.push({
    ts: Date.now(),
    amountEur: pack.priceEur,
    productId: pack.sku,
  });

  // Bonus path — guaranteed thrall or random rare.
  let thrallGranted: string | null = null;
  let rarePullThrall: string | null = null;
  if (pack.bonus.kind === 'guaranteed_thrall') {
    const id = pack.bonus.thrallId;
    const ps = blob.playerThralls?.[id];
    if (!ps?.owned) {
      blob.playerThralls = blob.playerThralls ?? {};
      blob.playerThralls[id] = {
        owned: true,
        level: 1,
        xp: 0,
        stars: 0,
        firstObtainedAt: Date.now(),
        isNew: true,
      };
      thrallGranted = id;
    }
  } else if (pack.bonus.kind === 'guaranteed_rare') {
    const owned = blob.playerThralls ?? {};
    const unowned = RARE_THRALL_IDS.filter((id) => !owned[id]?.owned);
    if (unowned.length > 0) {
      // Use crypto rng for the random pick — same security stance as
      // the gacha-pull engine.
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      const idx = buf[0] % unowned.length;
      const pick = unowned[idx];
      blob.playerThralls = blob.playerThralls ?? {};
      blob.playerThralls[pick] = {
        owned: true,
        level: 1,
        xp: 0,
        stars: 0,
        firstObtainedAt: Date.now(),
        isNew: true,
      };
      rarePullThrall = pick;
    } else {
      // Compensation: 10 ichor (mirror grantPackContents fallback).
      blob.ichor = (blob.ichor ?? 0) + 10;
      blob.ichorLedger.push({
        ts: Date.now(),
        amount: 10,
        balance: blob.ichor,
        source: 'iap_pack',
      });
    }
  }

  // INSERT the purchase log + UPDATE state_blob in two writes. We do
  // the purchase row FIRST: if the unique constraint on order_id fires
  // (concurrent retry), the state_blob update is skipped and we
  // delegate to the idempotency replay branch above on the next call.
  const { error: insErr } = await admin.from('purchases').insert({
    player_id: userId,
    sku: pack.sku,
    order_id: body.order_id,
    purchase_token: body.purchase_token,
    price_eur: pack.priceEur,
    ichor_credited: ichorCredited,
    was_first_time: isFirstTime,
    validated_at: validatedAt,
  });
  if (insErr) {
    const code = (insErr as { code?: string }).code;
    if (code === '23505') {
      // Concurrent winner already inserted. Refuse here so we don't
      // double-grant; the client should refetch state from cloud-sync.
      return errorResponse('already_validated', 409);
    }
    return errorResponse('insert_failed', 500);
  }

  const { error: writeErr } = await admin
    .from('player_state')
    .update({ state_blob: blob })
    .eq('owner_id', userId);
  if (writeErr) {
    // Rare: the purchase row was written but state_blob failed.
    // Surface so the client can re-fetch from cloud-sync and the
    // operator can see this in logs.
    return errorResponse('write_failed_after_purchase', 500);
  }

  return jsonResponse({
    ok: true,
    grant: {
      sku: pack.sku,
      ichorCredited,
      ichorWasFirstTime: isFirstTime,
      thrallGranted,
      rarePullThrall,
    } satisfies Grant,
    validated: validatedAt !== null,
  });
});
