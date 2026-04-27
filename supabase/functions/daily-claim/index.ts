// Edge function: daily-claim
//
// POST /functions/v1/daily-claim
// Body: { client_date: 'YYYY-MM-DD', client_rate: number }
// Auth: Bearer JWT
//
// Server-validated daily login claim. Steps:
//   1. Verify JWT → userId.
//   2. Validate body. client_date must be within ±2 days of UTC today
//      (timezone tolerance), and the rate must be a finite non-negative
//      number (used in the blood-reward formula).
//   3. Read player_state for userId.
//   4. Read most recent daily_claims row for this player → derive
//      previous (day_index, claim_date).
//   5. decideDayIndex(prev, today) → today's day_index 0..6.
//   6. rewardFor(day_index, client_rate) → blood/dread/ichor.
//   7. INSERT daily_claims (unique constraint catches double-claim
//      across devices in the same day → 409 already_claimed).
//   8. Patch player_state.state_blob: bump blood/dread/ichor + update
//      daily.{streakDay, lastClaimedDate}. Mirrors gameState.claimDaily.
//   9. Return { ok, day, reward, newState }.
//
// Anti-abuse:
//   - Unique (player_id, claim_date) prevents claim spam.
//   - ±2 day window prevents forward clock rollback.
//   - Rate is client-supplied but only multiplies the blood floor —
//     blood is the soft currency. Dread/Ichor rewards are FIXED per
//     day_index, so the cheat surface is bounded.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import {
  decideDayIndex,
  parseLocalDate,
  rewardFor,
  type DailyReward,
} from './config.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

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
  client_date: string;
  client_rate: number;
}

function validateBody(raw: unknown): RequestBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  const date = parseLocalDate(body.client_date);
  const rate = body.client_rate;
  if (!date) return null;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0) return null;
  return { client_date: date, client_rate: rate };
}

interface SaveBlob {
  blood?: number;
  dread?: number;
  lifetimeDread?: number;
  ichor?: number;
  ichorLedger?: Array<{ ts: number; amount: number; balance: number; source: string }>;
  daily?: { streakDay: number; lastClaimedDate: string };
  [key: string]: unknown;
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

  const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Read player_state.
  const { data: stateRow, error: readErr } = await admin
    .from('player_state')
    .select('state_blob')
    .eq('owner_id', userId)
    .maybeSingle();
  if (readErr) return errorResponse('read_failed', 500);
  if (!stateRow) return errorResponse('no_state', 409);
  const blob: SaveBlob = (stateRow as { state_blob: SaveBlob }).state_blob;

  // 2. Read most recent claim to derive streak.
  const { data: prevRow, error: prevErr } = await admin
    .from('daily_claims')
    .select('claim_date, day_index')
    .eq('player_id', userId)
    .order('claim_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (prevErr) return errorResponse('read_failed', 500);

  const prevDayIndex = prevRow ? (prevRow as { day_index: number }).day_index : null;
  const prevDate = prevRow ? (prevRow as { claim_date: string }).claim_date : null;

  // Idempotency: if today's row already exists, the client is replaying.
  if (prevDate === body.client_date) {
    return errorResponse('already_claimed', 409);
  }

  const dayIndex = decideDayIndex(prevDayIndex, prevDate, body.client_date);
  const reward: DailyReward = rewardFor(dayIndex, body.client_rate);

  // 3. INSERT daily_claims. The unique (player_id, claim_date)
  //    constraint is the actual server-side guard against double
  //    claims; if a concurrent invocation beats us here, we get 23505.
  const { error: claimErr } = await admin.from('daily_claims').insert({
    player_id: userId,
    claim_date: body.client_date,
    day_index: dayIndex,
    blood: reward.blood,
    dread: reward.dread,
    ichor: reward.ichor,
  });
  if (claimErr) {
    // 23505 = unique_violation = already claimed (race).
    const code = (claimErr as { code?: string }).code;
    if (code === '23505') return errorResponse('already_claimed', 409);
    return errorResponse('insert_failed', 500);
  }

  // 4. Patch the state_blob with the rewards + daily streak metadata.
  const newBlood = (blob.blood ?? 0) + reward.blood;
  const newIchor = (blob.ichor ?? 0) + reward.ichor;
  const newDread = (blob.dread ?? 0) + reward.dread;
  const newLifetimeDread = (blob.lifetimeDread ?? 0) + reward.dread;
  const newDaily = {
    streakDay: dayIndex + 1, // 1-indexed for the existing client schema
    lastClaimedDate: body.client_date,
  };

  blob.blood = newBlood;
  blob.dread = newDread;
  blob.lifetimeDread = newLifetimeDread;
  blob.ichor = newIchor;
  blob.daily = newDaily;
  // Append to ichor ledger so the in-game L3 ledger stays in sync.
  if (reward.ichor > 0) {
    blob.ichorLedger = blob.ichorLedger ?? [];
    blob.ichorLedger.push({
      ts: Date.now(),
      amount: reward.ichor,
      balance: newIchor,
      source: 'daily_login',
    });
  }

  const { error: writeErr } = await admin
    .from('player_state')
    .update({ state_blob: blob })
    .eq('owner_id', userId);
  if (writeErr) return errorResponse('write_failed', 500);

  return jsonResponse({
    ok: true,
    day: dayIndex + 1,
    reward,
    newState: {
      blood: newBlood,
      dread: newDread,
      lifetimeDread: newLifetimeDread,
      ichor: newIchor,
      daily: newDaily,
    },
  });
});
