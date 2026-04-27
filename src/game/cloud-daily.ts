// Server-authoritative daily-claim dispatcher.
//
// Used by the daily modal when the player is signed in. Flow:
//   1. Push current local snapshot so the server reads our latest
//      blood/dread/ichor before crediting the reward.
//   2. Invoke daily-claim edge function with { client_date, client_rate }.
//      client_date is the player's LOCAL date key (YYYY-MM-DD) so the
//      server respects timezone for the streak calculation.
//      client_rate drives the blood-floor formula (the bigger of
//      minBlood and rate × minutes × 60).
//   3. gameState.applyServerDailyEnvelope mirrors the credit locally
//      (events emitted: blood-changed, dread-changed, ichor-earned).
//
// On error (already_claimed, invalid_request, network) returns null so
// the caller can surface a generic toast. The local fallback path
// (gameState.claimDaily) is the offline equivalent.

import { getCurrentUser } from './auth';
import { gameState } from './state';
import { pushCurrentSnapshot } from './cloud-sync';
import { getSupabase } from '../platform/supabase';
import { localDateKey, type DailyReward } from './config/daily';

interface ServerEnvelope {
  ok: true;
  day: number;
  reward: DailyReward;
  newState: {
    blood: number;
    dread: number;
    lifetimeDread: number;
    ichor: number;
    daily: { streakDay: number; lastClaimedDate: string };
  };
}

interface ServerError {
  ok: false;
  error: string;
}

export interface CloudDailyResult {
  day: number;
  reward: DailyReward;
}

/** Trigger the cloud daily-claim flow. Returns the granted day +
 *  reward on success, null on any failure (already_claimed, network,
 *  insufficient_state, etc.). The caller (daily-modal) can decide
 *  whether to fall back to local or just bail out. */
export async function performCloudDailyClaim(): Promise<CloudDailyResult | null> {
  const user = getCurrentUser();
  if (!user) return null;

  try {
    await pushCurrentSnapshot();
  } catch {
    // Non-fatal — proceed; the blob may be one autosave behind.
  }

  const today = localDateKey();
  const clientRate = gameState.getTotalRate();

  const supabase = await getSupabase();
  const { data, error } = await supabase.functions.invoke('daily-claim', {
    body: { client_date: today, client_rate: clientRate },
  });
  if (error) return null;
  const envelope = data as ServerEnvelope | ServerError | null;
  if (!envelope || envelope.ok !== true) return null;

  gameState.applyServerDailyEnvelope({
    reward: envelope.reward,
    newState: envelope.newState,
  });
  return { day: envelope.day, reward: envelope.reward };
}
