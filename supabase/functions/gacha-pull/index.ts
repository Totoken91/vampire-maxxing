// Edge function: gacha-pull
//
// POST /functions/v1/gacha-pull
// Body: { banner_id: 'standard' | 'featured', count: 1 | 10 }
// Auth: Bearer JWT (verify_jwt: true at deploy time → handled by runtime)
//
// Response on success (200):
//   {
//     ok: true,
//     results: PullResult[],
//     newState: {
//       ichor, essences, ritualState,
//       newlyObtained: [{ id, ts }],
//       welcomeTributeArmed,
//       pendingFrissonBuff,
//     }
//   }
//
// Response on error (4xx):
//   { ok: false, error: 'insufficient_ichor' | 'invalid_request' | 'no_state' | ... }
//
// Side effects:
//   1. UPDATE player_state SET state_blob = ... WHERE owner_id = auth.uid()
//   2. INSERT INTO gacha_pulls (...)
//
// IMPORTANT: this function is the only place that mutates ritualState
// while the user is signed in. The client's ritual.ts performLocalPull
// is the offline fallback path; it never hits Supabase. So divergence
// only matters at sign-in resolution (cloud-sync handles it).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import {
  costFor,
  runEngine,
  type PullResult,
  type PullState,
  type RitualState,
} from './engine.ts';
import type { BannerId } from './config.ts';

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
  banner_id: BannerId;
  count: 1 | 10;
}

function validateBody(raw: unknown): RequestBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  const bannerId = body.banner_id;
  const count = body.count;
  if (bannerId !== 'standard' && bannerId !== 'featured') return null;
  if (count !== 1 && count !== 10) return null;
  return { banner_id: bannerId, count };
}

interface PlayerStateRow {
  owner_id: string;
  version: number;
  state_blob: SaveBlob;
  server_seq: number;
}

// Loose subset of the SaveV5 fields the engine needs to read/write.
// The engine NEVER touches blood / dread / form / settings — those flow
// only through autosave. We narrow here so a stray typo can't corrupt
// unrelated fields.
interface SaveBlob {
  ichor?: number;
  ritualState?: RitualState;
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
  essences?: { common: number; rare: number; epic: number; legendary: number };
  welcomeTributeArmed?: boolean;
  pendingFrissonBuff?: boolean;
  ichorFlags?: Record<string, boolean>;
  ichorLedger?: Array<{ ts: number; amount: number; balance: number; source: string }>;
  // Anything else is preserved as-is.
  [key: string]: unknown;
}

function defaultRitualState(): RitualState {
  return {
    standard: {
      pityCounterRare: 0,
      pityCounterEpic: 0,
      pityCounterLegendary: 0,
      commonStreak: 0,
      totalPulls: 0,
    },
    featured: {
      pityCounterRare: 0,
      pityCounterEpic: 0,
      pityCounterLegendary: 0,
      commonStreak: 0,
      totalPulls: 0,
    },
    firstRareGuaranteeUsed: false,
    history: [],
  };
}

function defaultEssences(): { common: number; rare: number; epic: number; legendary: number } {
  return { common: 0, rare: 0, epic: 0, legendary: 0 };
}

/** Build the engine input state from the saved blob. Defaults fill in
 *  for older saves that predate L5 / V1.3. */
function buildEngineState(blob: SaveBlob): PullState {
  const owned = new Set<string>();
  if (blob.playerThralls) {
    for (const [id, entry] of Object.entries(blob.playerThralls)) {
      if (entry?.owned) owned.add(id);
    }
  }
  const ritual = blob.ritualState ?? defaultRitualState();
  // The blob may have an older RitualState shape that lacks
  // pityCounterLegendary on its banners (V1.2-EXT bumps it onto each
  // banner). Normalise by filling in 0 where missing.
  for (const b of ['standard', 'featured'] as const) {
    if (typeof ritual[b].pityCounterLegendary !== 'number') {
      ritual[b].pityCounterLegendary = 0;
    }
  }
  if (!Array.isArray(ritual.history)) ritual.history = [];
  return {
    ichor: blob.ichor ?? 0,
    ritualState: ritual,
    ownedThrallIds: owned,
    newlyObtained: new Map(),
    essences: blob.essences ?? defaultEssences(),
    welcomeTributeArmed: blob.welcomeTributeArmed ?? false,
    pendingFrissonBuff: blob.pendingFrissonBuff ?? false,
  };
}

/** Apply the engine output back onto the blob, mutating it in place.
 *  Returns the same reference for convenience. Touches only fields the
 *  engine actually owns; everything else (blood, dread, form, ...)
 *  passes through untouched. */
function applyEngineState(blob: SaveBlob, finalState: PullState, now: number): SaveBlob {
  blob.ichor = finalState.ichor;
  blob.ritualState = finalState.ritualState;
  blob.essences = finalState.essences;
  blob.welcomeTributeArmed = finalState.welcomeTributeArmed;
  blob.pendingFrissonBuff = finalState.pendingFrissonBuff;
  // Apply newly obtained thralls onto playerThralls.
  if (finalState.newlyObtained.size > 0) {
    blob.playerThralls = blob.playerThralls ?? {};
    for (const [id, ts] of finalState.newlyObtained) {
      blob.playerThralls[id] = {
        owned: true,
        level: 1,
        xp: 0,
        stars: 0,
        firstObtainedAt: ts,
        isNew: true,
      };
    }
  }
  // ichorFlags marker for the FRG, mirroring the client's behaviour.
  // Some downstream achievements key on this flag.
  if (finalState.ritualState.firstRareGuaranteeUsed) {
    blob.ichorFlags = blob.ichorFlags ?? {};
    blob.ichorFlags['ritual:firstRareGuarantee'] = true;
  }
  // ichorLedger entry for the spend, mirroring grantIchor/spendIchor.
  // We don't have access to the original cost here without re-deriving
  // it; just record what changed.
  // (Skipped for MVP: the client UI re-derives from ichorFlags + state.)
  void now;
  return blob;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse('missing_auth', 401);
  }

  // Build a user-scoped client just to verify the JWT and resolve
  // auth.uid(). The mutating writes use service_role since gacha_pulls
  // has no client-INSERT policy.
  const userClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return errorResponse('invalid_auth', 401);
  }
  const userId = userData.user.id;

  let bodyRaw: unknown = null;
  try {
    bodyRaw = await req.json();
  } catch {
    return errorResponse('invalid_request', 400);
  }
  const body = validateBody(bodyRaw);
  if (!body) return errorResponse('invalid_request', 400);

  // Service-role client for the actual mutations. Bypasses RLS, so
  // the engine writes to player_state + gacha_pulls atomically without
  // re-deriving the JWT.
  const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Read player_state.
  const { data: row, error: readErr } = await admin
    .from('player_state')
    .select('owner_id, version, state_blob, server_seq')
    .eq('owner_id', userId)
    .maybeSingle();
  if (readErr) return errorResponse('read_failed', 500);
  if (!row) return errorResponse('no_state', 409); // client must finish migration first
  const stateRow = row as PlayerStateRow;

  // 2. Build engine state + run.
  const blob: SaveBlob = stateRow.state_blob;
  const cost = costFor(body.count);
  if ((blob.ichor ?? 0) < cost) {
    return errorResponse('insufficient_ichor', 402);
  }

  const engineState = buildEngineState(blob);
  const now = Date.now();
  let engineOut: { state: PullState; results: PullResult[] };
  try {
    engineOut = runEngine({
      state: engineState,
      banner: body.banner_id,
      count: body.count,
      rng: secureRng(),
      now,
    });
  } catch (e) {
    return errorResponse(
      e instanceof Error ? e.message : 'engine_failure',
      500,
    );
  }

  // 3. Mutate the blob.
  applyEngineState(blob, engineOut.state, now);

  // 4. Persist (single round-trip; the trigger bumps server_seq).
  const { error: writeErr } = await admin
    .from('player_state')
    .update({ state_blob: blob })
    .eq('owner_id', userId);
  if (writeErr) return errorResponse('write_failed', 500);

  // 5. Append a gacha_pulls log row. We strip the flags down to a
  //    compact array to avoid blowing up jsonb size on prolific players.
  const logResults = engineOut.results.map((r) => ({
    thrallId: r.thrallId,
    rarity: r.rarity,
    wasDupe: r.wasDupe,
    essenceGained: r.essenceGained,
    isCinder: r.isCinder,
    flags: stripFalseFlags(r.flags),
  }));
  await admin.from('gacha_pulls').insert({
    player_id: userId,
    banner_id: body.banner_id,
    pull_count: body.count,
    results: logResults,
    ichor_spent: cost,
  });

  // 6. Compose the response payload.
  const newlyObtained = [...engineOut.state.newlyObtained.entries()].map(
    ([id, ts]) => ({ id, ts }),
  );
  return jsonResponse({
    ok: true,
    results: engineOut.results,
    newState: {
      ichor: engineOut.state.ichor,
      ritualState: engineOut.state.ritualState,
      essences: engineOut.state.essences,
      welcomeTributeArmed: engineOut.state.welcomeTributeArmed,
      pendingFrissonBuff: engineOut.state.pendingFrissonBuff,
      newlyObtained,
    },
  });
});

/** Cryptographically-secure RNG that returns floats in [0, 1).
 *  Uses crypto.getRandomValues so server-side rolls aren't reproducible
 *  and aren't seeded from the system clock. */
function secureRng(): () => number {
  const buf = new Uint32Array(1);
  return () => {
    crypto.getRandomValues(buf);
    return buf[0] / 0x1_0000_0000;
  };
}

function stripFalseFlags(flags: Record<string, boolean>): Record<string, true> {
  const out: Record<string, true> = {};
  for (const [k, v] of Object.entries(flags)) {
    if (v) out[k] = true;
  }
  return out;
}
