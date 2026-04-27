import { describe, expect, it } from 'vitest';
import { getCurrentUser } from '../src/game/auth';

// We don't mount the full Supabase client in unit tests — that would
// require either a network mock or a fixture. The auth flow itself is
// covered manually in dev (see docs/12-SETUP-AUTH.md) and the cloud
// sync logic has its own decision-matrix tests in cloud-sync.test.ts.
//
// What this file confirms is the synchronous public surface:
//   - getCurrentUser() returns null until a session is restored. The UI
//     reads this on every menu open to decide whether to render the
//     "SIGN IN" button or the "SIGN OUT" row.

describe('auth public surface', () => {
  it('getCurrentUser starts as null', () => {
    expect(getCurrentUser()).toBeNull();
  });
});
