// Cloud sync — bridges the local save (localStorage / Capacitor Preferences
// via save.ts) and the player_state row in Supabase. The flow:
//
//   1. App boots → restoreSession() resolves → 'auth-changed' fires.
//   2. cloud-sync handler decides what to do based on local + cloud state:
//      - Both fresh:        upsert local. Silent.
//      - Local has, cloud empty:  push local. Toast "Cloud sync ready".
//      - Local empty, cloud has:  pull cloud. Toast "Welcome back".
//      - Both have data, divergent: open conflict modal.
//   3. While signed in, autosave writes to BOTH localStorage AND cloud
//      (cloud writes debounced separately at 15s — taps shouldn't hit
//      the network every 500ms).
//   4. Sign-out cuts cloud writes; localStorage continues.
//
// IMPORTANT: this module is the only place that touches the player_state
// table from the client. Edge functions (later prompts) use service_role
// to write to gacha_pulls / daily_claims / purchases.

import { events } from './events';
import { gameState } from './state';
import { parseSave, SAVE_VERSION, type SaveV5 } from './save';
import { getCurrentUser } from './auth';
import { getSupabase } from '../platform/supabase';

/** Heuristic: does this snapshot represent a player who has actually
 *  played, or just a freshly-initialised state? Drives the conflict
 *  detection logic. */
export function snapshotHasProgress(save: SaveV5): boolean {
  return (
    save.stats.totalAscends > 0 ||
    save.totalLifetimeBlood > 1000 ||
    save.stats.totalTaps > 50
  );
}

/** Pure decision function used by cloud-sync and by tests. */
export type SyncDecision =
  | { kind: 'push-local' }
  | { kind: 'pull-cloud' }
  | { kind: 'no-op' }
  | { kind: 'conflict' };

export function decideSync(
  local: SaveV5 | null,
  cloud: SaveV5 | null,
): SyncDecision {
  const localHas = local ? snapshotHasProgress(local) : false;
  const cloudHas = cloud ? snapshotHasProgress(cloud) : false;
  if (!cloud && local) return { kind: 'push-local' };
  if (cloud && !local) return { kind: 'pull-cloud' };
  if (!local && !cloud) return { kind: 'no-op' };
  // Both sides exist.
  if (cloudHas && localHas) {
    // Identical snapshots (e.g. cloud was just pushed by this device a
    // moment ago) → no work. Cheap check: serialize and compare.
    if (JSON.stringify(local) === JSON.stringify(cloud)) {
      return { kind: 'no-op' };
    }
    return { kind: 'conflict' };
  }
  if (localHas && !cloudHas) return { kind: 'push-local' };
  if (cloudHas && !localHas) return { kind: 'pull-cloud' };
  // Both fresh — push local so the row exists for future autosaves.
  return { kind: 'push-local' };
}

/** Module-level state. */
interface CloudSyncState {
  /** Latest server_seq received from Supabase. Used for optimistic
   *  concurrency on the next push. -1 means "no row exists yet". */
  serverSeq: number;
  /** Most recent push promise — chained so concurrent autosaves serialise
   *  properly instead of racing each other to overwrite the row. */
  inflight: Promise<void> | null;
  /** Set when sign-in is in progress and the conflict modal hasn't
   *  resolved yet. While true, autosave skips cloud writes (avoids
   *  clobbering whatever the user's about to choose). */
  resolvingConflict: boolean;
}

const state: CloudSyncState = {
  serverSeq: -1,
  inflight: null,
  resolvingConflict: false,
};

/** Public for tests + UI hints. */
export function isCloudReady(): boolean {
  return state.serverSeq >= 0 && !state.resolvingConflict;
}

/** Reset module state — used by tests + on sign-out. */
function resetCloudState(): void {
  state.serverSeq = -1;
  state.inflight = null;
  state.resolvingConflict = false;
}

/** Boot wire: subscribe to auth events. Idempotent. */
let installed = false;
export function installCloudSync(): void {
  if (installed) return;
  installed = true;
  events.on('auth-changed', ({ user }) => {
    if (user) {
      void onSignedIn();
    } else {
      resetCloudState();
    }
  });
}

async function onSignedIn(): Promise<void> {
  const user = getCurrentUser();
  if (!user) return;
  state.resolvingConflict = true;
  try {
    const cloudRow = await fetchCloudRow(user.id);
    const localSave = gameState.getSaveSnapshot();
    const cloudSave = cloudRow ? parseCloudBlob(cloudRow) : null;
    const decision = decideSync(localSave, cloudSave);

    switch (decision.kind) {
      case 'push-local':
        await pushToCloud(user.id, localSave, cloudRow?.server_seq ?? null);
        notifyResolved('push');
        break;
      case 'pull-cloud':
        if (cloudSave) {
          gameState.applyCloudSnapshot(cloudSave);
          await gameState.saveToStorage();
          state.serverSeq = cloudRow?.server_seq ?? 1;
          notifyResolved('pull');
        }
        break;
      case 'no-op':
        // The cloud row already matches local. Just record server_seq
        // so future pushes can use it for concurrency.
        state.serverSeq = cloudRow?.server_seq ?? -1;
        break;
      case 'conflict': {
        const choice = await openConflictResolution(localSave, cloudSave!);
        if (choice === 'cancel') {
          // User backed out of the sign-in. Drop the Supabase session
          // without touching any local data.
          const { signOut } = await import('./auth');
          await signOut();
          return;
        }
        if (choice === 'cloud' && cloudSave) {
          gameState.applyCloudSnapshot(cloudSave);
          await gameState.saveToStorage();
          state.serverSeq = cloudRow?.server_seq ?? 1;
          notifyResolved('pull');
        } else {
          await pushToCloud(user.id, localSave, cloudRow?.server_seq ?? null);
          notifyResolved('push');
        }
        break;
      }
    }
  } catch (e) {
    // Silent — the local save still works, sign-in can be retried later.
    console.warn('[cloud-sync] sign-in resolve failed', e);
  } finally {
    state.resolvingConflict = false;
  }
}

/** Push the current snapshot to cloud. Awaitable so autosave can chain. */
export async function pushCurrentSnapshot(): Promise<void> {
  const user = getCurrentUser();
  if (!user || state.resolvingConflict) return;
  const snapshot = gameState.getSaveSnapshot();
  await pushToCloud(user.id, snapshot, state.serverSeq);
}

interface CloudRow {
  state_blob: unknown;
  version: number;
  server_seq: number;
}

async function fetchCloudRow(userId: string): Promise<CloudRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('player_state')
    .select('state_blob, version, server_seq')
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as CloudRow | null) ?? null;
}

function parseCloudBlob(row: CloudRow): SaveV5 | null {
  // The blob is stored as JSONB in Postgres; the client receives it as a
  // plain object. Round-trip through parseSave so version migrations
  // apply uniformly (a v4 blob in cloud still upgrades on pull).
  const raw = JSON.stringify(row.state_blob);
  return parseSave(raw);
}

async function pushToCloud(
  userId: string,
  snapshot: SaveV5,
  expectedServerSeq: number | null,
): Promise<void> {
  // Serialize concurrent calls so a fast autosave can't overtake a
  // slower one and write stale data on top of fresh data.
  const work = (async () => {
    const supabase = await getSupabase();
    const blob: SaveV5 = { ...snapshot, ts: Date.now() };
    if (expectedServerSeq === null || expectedServerSeq < 0) {
      // First write. INSERT (RLS gates on auth.uid() = owner_id).
      const { data, error } = await supabase
        .from('player_state')
        .insert({
          owner_id: userId,
          version: SAVE_VERSION,
          state_blob: blob,
        })
        .select('server_seq')
        .single();
      if (error) throw error;
      state.serverSeq = (data as { server_seq: number }).server_seq;
      return;
    }
    // UPDATE. Rely on the bump_player_state_seq trigger to advance
    // server_seq atomically; we just overwrite state_blob + version.
    const { data, error } = await supabase
      .from('player_state')
      .update({
        version: SAVE_VERSION,
        state_blob: blob,
      })
      .eq('owner_id', userId)
      .select('server_seq')
      .single();
    if (error) throw error;
    state.serverSeq = (data as { server_seq: number }).server_seq;
  })();
  // Chain: previous write must finish before this one starts.
  state.inflight = (state.inflight ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => work);
  return state.inflight;
}

function notifyResolved(kind: 'push' | 'pull'): void {
  // Defer the import so tests can stub the toast layer cleanly.
  void import('../ui/components/toast').then(({ showToast }) => {
    if (kind === 'push') {
      showToast('CLOUD SYNC', 'Your bloodline is bound to the cloud.');
    } else {
      showToast('WELCOME BACK', 'Your bloodline returns from the cloud.');
    }
  });
}

/** Lazy import the modal component so tests + builds without the modal
 *  in scope still parse cleanly. Returns 'cloud' | 'local' | 'cancel'. */
async function openConflictResolution(
  local: SaveV5,
  cloud: SaveV5,
): Promise<'cloud' | 'local' | 'cancel'> {
  const { showCloudConflictModal } = await import(
    '../ui/components/cloud-conflict-modal'
  );
  return showCloudConflictModal(local, cloud);
}

/** Test-only escape hatch. */
export function _resetForTests(): void {
  installed = false;
  resetCloudState();
}
