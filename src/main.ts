// Vampire Maxxing — entry point.

import './styles/index.css';
import { mountApp } from './ui/app';
import { startLoop } from './game/loop';
import { installFx } from './fx';
import { installMilestone } from './fx/milestone';
import { showDailyModal } from './ui/components/daily-modal';
import { showAgeGate } from './ui/components/age-gate';
import { installAnalytics } from './analytics/install';
import { track } from './analytics/events';
import { installFtue } from './ftue';
import { startAutosave } from './game/autosave';
import { maybeShowOfflineModal } from './ui/components/offline-modal';
import { showToast, showIchorToast } from './ui/components/toast';
import { events } from './game/events';
import { gameState } from './game/state';
import { installMusic } from './audio/music';
import { playButton } from './audio/sfx';
import { initAds } from './platform/ads';
import { checkAchievements, installAchievementChecks } from './game/achievements';
import { ACHIEVEMENTS_BY_ID } from './game/config/achievements';
import { showAchievementToast } from './ui/components/achievement-toast';
import { installMilestones } from './game/milestones';
import { installIchorRewards } from './game/ichor-rewards';
import { installAwakening } from './game/awakening-install';
import { installQuestTracking } from './game/quests-install';
import { installFounderPackTrigger } from './game/iap';
import { installWelcomePackModal } from './ui/components/welcome-pack-modal';
import { initIap } from './platform/iap';
import { restoreSession } from './game/auth';
import { installCloudSync } from './game/cloud-sync';
import { installIchorTooltip } from './ui/components/ichor-tooltip';
import { SERVANTS, SERVANTS_BY_ID } from './game/config/servants';
import { FORMS, FORMS_BY_ID, type VampireForm } from './game/config/forms';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app root element');
}
const appRoot = root;

async function boot(): Promise<void> {
  // Restore save (if any) BEFORE the UI renders so components read final state.
  const offlineReport = await gameState.loadFromStorage();

  // Publish milestone-driven modifiers (M1: Bloodline Scholar auto-tier
  // from Dread Level). Must run after state load and before any
  // rate/cost calc fires. Subscribes to dread-changed internally.
  installMilestones();

  // L3 — Ichor reward hooks (prestige milestones, first Rare/Epic,
  // collection complete). Also retroactively grants any milestone
  // a returning save has already passed.
  installIchorRewards();

  // L6 — wire equip events to modifier registry + republish equipped
  // thrall modifiers from the loaded save so the registry matches
  // state without manual fix-up. Subscribes to thrall-equipped /
  // thrall-awakened internally.
  installAwakening();

  // L_QUESTS — daily quest metric tracking. Subscribes to gameplay
  // events to fill the per-day metric counters and rotates the
  // active quest if the local date changed since last save.
  installQuestTracking();

  // L10/L11 — IAP. initIap() warms the Capacitor Play Billing client
  // (no-op on web). The founder-pack trigger arms once on first Rare+
  // acquisition; the welcome modal listens to that arm event and
  // surfaces the offer 3s after the Rare reveal.
  void initIap();
  installFounderPackTrigger();
  installWelcomePackModal();

  // Pre-launch — Supabase Auth + Google Sign-In. Restores the persisted
  // session in the background so the menu's Account row reflects state
  // by the time the player opens it. No-op when env vars are missing.
  // installCloudSync() MUST register before restoreSession() resolves —
  // the auth-changed event fires once the persisted session loads, and
  // the cloud-sync handler decides whether to push local or pull cloud.
  installCloudSync();
  void restoreSession();

  // L15 — One-shot tooltip explaining Ichor's purpose, anchored to
  // the HUD pill and dismissed on tap or after 5s. Listens to the
  // very first 'ichor-earned' event of the save's lifetime.
  installIchorTooltip();

  // L14 — analytics. Subscribes to the game event bus + emits
  // session_started with cohort context. Provider sink is no-op
  // until a real provider (Firebase / Adjust / Mixpanel) lands.
  installAnalytics({ resumed: offlineReport !== null });

  installFx(document.body);
  installMilestone();
  mountApp(appRoot);
  startLoop();
  startAutosave();

  // Default toast on every first-of-tier purchase. FTUE registers AFTER this
  // and overrides with "FIRST SPARK" when applicable.
  events.on('servant-bought', ({ id, owned }) => {
    if (owned !== 1) return;
    const name = SERVANTS_BY_ID[id].name;
    showToast('CLAIMED', `A new ${name.toLowerCase()} kneels before you.`);
  });

  installFtue();

  // Background music: autoplay if allowed, first-gesture fallback otherwise,
  // pauses/resumes with page visibility.
  installMusic();

  // AdMob: fire and forget. Init is idempotent and safe on web (no-ops).
  void initAds();

  // Achievements: show toast on unlock, run checks on relevant events, and
  // catch anything the predicates say is done at load (e.g. the offline
  // modal just pushed play time past 1h).
  events.on('achievement-unlocked', ({ id }) => {
    const def = ACHIEVEMENTS_BY_ID[id];
    if (def) showAchievementToast(def);
  });
  installAchievementChecks();
  checkAchievements();

  // Blood Altar upgrade was removed in M1 (redundant with Velmor thrall's
  // auto-collect effect landing in Phase L7).

  // Back-fill lore unlocks for existing saves from before the Bestiary /
  // Histories shipped. Any thrall the player has ever bought unlocks its
  // entry; any form reached so far unlocks its history.
  backfillLoreUnlocks();

  // V1.2-HF1 — Anti-treadhill hotfix compensation. Existing players who
  // have already prestiged at least once get +10 Ichor on the first
  // launch post-patch as goodwill for the threshold scaling change.
  // One-shot via the ichorFlags ledger; brand-new saves get nothing.
  applyHotfixV12Hf1Compensation();

  // V1.3 — Re-apply runtime effects of every owned meta-tree node.
  // Modifiers aren't persisted (only state is), so a returning save
  // with owned nodes needs to republish their effects. Cheap (one
  // record walk) — fine to do unconditionally.
  void import('./game/soulreave').then(({ reapplyOwnedMetaNodes }) =>
    reapplyOwnedMetaNodes(),
  );

  // V1.3 — First-Soulreave reveal toast. When a Soulreave just
  // happened, surface a one-shot hint pointing the player at the
  // meta-tree access in the Ascend modal.
  events.on('soulreaved', ({ index, soulShardsGained }) => {
    if (index === 1) {
      showToast(
        'SOULREAVE I',
        `+${soulShardsGained} Soul Shards. Open ASCEND to spend them.`,
      );
    } else {
      showToast(
        `SOULREAVE ${romanIfShort(index)}`,
        `+${soulShardsGained} Soul Shards.`,
      );
    }
  });

  // V1.2-HF1 — Auto-ascend pause toast on form-bump. The engine fires
  // 'auto-ascend-paused' once when the next ascend would cross a form
  // threshold; we redirect the player to the manual cinematic.
  events.on('auto-ascend-paused', () => {
    showToast(
      'AUTO PAUSED',
      'A new Form awaits — tap ASCEND to embrace the transition.',
    );
  });

  // Toast on lore unlock.
  events.on('lore-unlocked', ({ kind, id }) => {
    if (kind === 'servant') {
      const def = SERVANTS_BY_ID[id as keyof typeof SERVANTS_BY_ID];
      if (def) showToast('NEW ENTRY', `${def.name} added to the Bestiary.`);
    } else {
      const def = FORMS_BY_ID[id as VampireForm];
      if (def) showToast('NEW ENTRY', `${def.subtitle} added to the Histories.`);
    }
  });

  // SFX on SUCCESSFUL thrall purchase only (the event only fires when the
  // buy went through — blood < cost silently returns false upstream).
  events.on('servant-bought', () => playButton());

  // L3 — violet toast on every Ichor earn, with source-specific flavor.
  events.on('ichor-earned', ({ amount, source }) => {
    showIchorToast(amount, source);
  });

  // L13 — age gate. Fires on first launch (or returning save with
  // pre-L13 state), blocks further system modals until answered.
  // Compliance-mandated: RGPD + KR 2024 + EU best practice.
  if (gameState.getAgeConfirmation() === 'unconfirmed') {
    await showAgeGate();
    const after = gameState.getAgeConfirmation();
    if (after !== 'unconfirmed') {
      track('age_gate_answered', { confirmation: after });
    }
  }

  if (offlineReport) {
    maybeShowOfflineModal(offlineReport, (amount) => {
      gameState.applyOfflineGain(amount);
    });
  }

  // K5 daily gift — show AFTER the offline modal dismisses so we never
  // stack two modals. If no offline modal was shown (elapsed < 60s), the
  // daily fires immediately. MutationObserver watches the offline
  // backdrop and triggers the daily when it's detached.
  if (gameState.canClaimDaily()) {
    const offlineBackdrop = document.querySelector('.offline-modal__backdrop');
    if (!offlineBackdrop) {
      showDailyModal();
    } else {
      const observer = new MutationObserver(() => {
        if (!document.body.contains(offlineBackdrop)) {
          observer.disconnect();
          showDailyModal();
        }
      });
      observer.observe(document.body, { childList: true });
    }
  }

  if (import.meta.env.DEV) {
    void import('./dev/cheats').then((m) => {
      m.installCheats();
      // Don't override the persisted state if a save already existed.
      if (!offlineReport && gameState.isFirstSession()) {
        window.vm?.setForm('LORD_OF_NIGHT');
      }
    });
  }
}

void boot();

/**
 * V1.2-HF1 — One-shot Ichor compensation for legacy players when the
 * Anti-Treadmill Hotfix lands. Players past their first ascend get
 * +10 Ichor as goodwill since the per-form threshold scaling will
 * make their next-form ascend slower than they were used to. The
 * flag in `ichorFlags` keeps the grant strictly one-shot per save.
 */
/** V1.3 — Tiny roman-numeral helper for the Soulreave toast. Falls
 *  back to "№N" beyond 10 because anyone Soulreaving 11+ times has
 *  earned their numeric overlay. */
function romanIfShort(n: number): string {
  const numerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  if (n >= 1 && n < numerals.length) return numerals[n];
  return `№${n}`;
}

function applyHotfixV12Hf1Compensation(): void {
  const FLAG = 'hotfix:v1.2-hf1:compensation';
  const flags = (gameState.get() as unknown as {
    ichorFlags: Record<string, boolean>;
  }).ichorFlags;
  if (flags[FLAG]) return;
  flags[FLAG] = true;
  // Brand-new saves (totalAscends === 0) didn't experience the old
  // threshold cadence so they don't need compensation.
  if (gameState.getPrestigeCount() < 1) return;
  void import('./game/ichor').then(({ grantIchor }) => {
    grantIchor(10, 'event_reward');
    showToast(
      'BALANCE UPDATE',
      'Your bloodline owes you 10 Ichor. The Ancients balance the books.',
    );
  });
}

/**
 * Saves written before the Tome lore expansion don't yet record which
 * thralls/forms have revealed their entries. Infer from existing state:
 * every thrall ever purchased → thrall lore; every form up to the highest
 * reached → history lore. Safe to run every boot; it only adds, never
 * removes.
 */
function backfillLoreUnlocks(): void {
  const snap = gameState.get();
  for (const servant of SERVANTS) {
    if (snap.servants[servant.id].totalPurchased > 0) {
      snap.unlockedServantLore.add(servant.id);
    }
  }
  const highest = snap.stats.highestFormReached;
  const highestIdx = FORMS.findIndex((f) => f.id === highest);
  for (let i = 0; i <= highestIdx; i++) {
    snap.unlockedFormLore.add(FORMS[i].id);
  }
}
