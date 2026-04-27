// Server-authoritative pull dispatcher.
//
// Used by ritual.ts when the player is signed in. Flow:
//   1. Flush local state to cloud (so the server reads our latest
//      blood/dread/etc. — the engine only mutates ritual fields, but
//      the rest of the blob still gets persisted in the same row).
//   2. Invoke the gacha-pull edge function with banner + count.
//   3. Apply the returned envelope to local gameState — emits the same
//      events that local performPull would (ritual-pull-performed,
//      ichor-changed, essence-gained, thrall-obtained) so animations
//      and achievement checks keep firing.
//   4. Spend the cost was already deducted server-side; we mirror that
//      via applyServerPullEnvelope.
//
// On error (network, RLS, insufficient ichor server-side, etc.) returns
// null and surfaces a toast. Caller (rituals-screen) handles the null
// the same way it would handle a local "can't afford" rejection.

import { events } from './events';
import { getCurrentUser } from './auth';
import { gameState } from './state';
import { pushCurrentSnapshot } from './cloud-sync';
import { getSupabase } from '../platform/supabase';
import type { BannerId } from './config/banners';
import type { PullResult } from './ritual';

interface ServerEnvelope {
  ok: true;
  results: PullResult[];
  newState: {
    ichor: number;
    ritualState: ReturnType<typeof gameState.getRitualState>;
    essences: ReturnType<typeof gameState.getAllEssences>;
    welcomeTributeArmed: boolean;
    pendingFrissonBuff: boolean;
    newlyObtained: ReadonlyArray<{ id: string; ts: number }>;
  };
}

interface ServerError {
  ok: false;
  error: string;
}

export async function performCloudPull(
  banner: BannerId,
  count: 1 | 10,
): Promise<PullResult[] | null> {
  const user = getCurrentUser();
  if (!user) return null;

  // Flush local state first. The engine only mutates ritual fields, but
  // we still want the rest (blood, dread, ascend bookkeeping, ichor
  // ledger…) to be up to date on the row before the edge function reads
  // it — otherwise the next sync after the pull would briefly show
  // stale data.
  try {
    await pushCurrentSnapshot();
  } catch {
    // Push failures are silent; we still proceed with the pull. Worst
    // case the blob the server reads is one autosave behind, which the
    // next push will fix.
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase.functions.invoke('gacha-pull', {
    body: { banner_id: banner, count },
  });
  if (error) {
    return null;
  }
  const envelope = data as ServerEnvelope | ServerError | null;
  if (!envelope || envelope.ok !== true) {
    return null;
  }

  // Apply the diff to local state. This emits the same events local
  // performPull would, so the existing UI listeners just keep working.
  gameState.applyServerPullEnvelope({ newState: envelope.newState });

  // ritual-pull-performed drives the pull-animation overlay. Local
  // performPull emits this at the end of its run; we mirror it here so
  // the UI is decoupled from the dispatch path.
  events.emit('ritual-pull-performed', {
    banner,
    results: envelope.results,
  });

  return envelope.results;
}
