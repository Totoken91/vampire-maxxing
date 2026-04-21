// Rewarded ad wrapper (J10).
// - Native Android (Capacitor): real AdMob through @capacitor-community/admob.
//   The plugin module is dynamically imported so the web bundle stays clean.
// - Web / dev server: no native plugin → showRewarded() resolves as
//   not-rewarded immediately (the caller shows a "rite failed" toast and
//   the game plays on).
//
// Call initAds() once at boot. Call showRewarded(type) on player action.

const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';
// Kenny's real rewarded ad unit — "VM Rewarded Main" created 2026-04-21.
const PROD_REWARDED_ID = 'ca-app-pub-1055719152373783/4532355142';

export type RewardAdType = 'summon-night' | 'embrace-dawn' | 'invoke-curse' | 'offering';

export interface RewardResult {
  rewarded: boolean;
  /** Why the reward was NOT granted, if applicable. 'native-unavailable'
   * means the platform has no ad support; 'dismissed' means the user
   * closed the ad before completion; 'failed' = AdMob load error. */
  reason?: 'native-unavailable' | 'dismissed' | 'failed';
}

let initialized = false;
let admobPromise: Promise<typeof import('@capacitor-community/admob') | null> | null = null;

function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return cap?.isNativePlatform ? cap.isNativePlatform() : false;
}

async function getAdMob(): Promise<typeof import('@capacitor-community/admob') | null> {
  if (!isNativePlatform()) return null;
  if (!admobPromise) {
    admobPromise = import('@capacitor-community/admob').catch((err) => {
      console.warn('[ads] AdMob module load failed', err);
      return null;
    });
  }
  return admobPromise;
}

export async function initAds(): Promise<void> {
  if (initialized) return;
  const mod = await getAdMob();
  if (!mod) return;
  try {
    // Only gate as "testing" in dev so AdMob serves test fills with no risk
    // of invalid-traffic strikes on Kenny's account. Production release =
    // real init so real ads actually serve once the app is approved.
    await mod.AdMob.initialize({
      initializeForTesting: import.meta.env.DEV,
    });
    initialized = true;
  } catch (err) {
    console.warn('[ads] AdMob init failed', err);
  }
}

const REWARDED_ID = import.meta.env.DEV ? TEST_REWARDED_ID : PROD_REWARDED_ID;

/**
 * Show a rewarded ad. Returns `{ rewarded: true }` when the user actually
 * earned the reward, `{ rewarded: false, reason }` otherwise. Safe on web.
 */
export async function showRewarded(_type: RewardAdType): Promise<RewardResult> {
  const mod = await getAdMob();
  if (!mod) return { rewarded: false, reason: 'native-unavailable' };
  if (!initialized) await initAds();
  if (!initialized) return { rewarded: false, reason: 'failed' };

  const { AdMob, RewardAdPluginEvents } = mod;
  try {
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_ID });
  } catch (err) {
    console.warn('[ads] prepareRewardVideoAd failed', err);
    return { rewarded: false, reason: 'failed' };
  }

  return new Promise<RewardResult>((resolve) => {
    let settled = false;
    const settle = (result: RewardResult): void => {
      if (settled) return;
      settled = true;
      void rewardedListener.then((l) => l.remove());
      void dismissedListener.then((l) => l.remove());
      void failedListener.then((l) => l.remove());
      resolve(result);
    };

    const rewardedListener = AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      settle({ rewarded: true });
    });
    const dismissedListener = AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      settle({ rewarded: false, reason: 'dismissed' });
    });
    const failedListener = AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
      settle({ rewarded: false, reason: 'failed' });
    });

    AdMob.showRewardVideoAd().catch((err) => {
      console.warn('[ads] showRewardVideoAd failed', err);
      settle({ rewarded: false, reason: 'failed' });
    });
  });
}

/** Cheap sync check the UI can use to decide whether to show ad buttons. */
export function adsAvailable(): boolean {
  return isNativePlatform();
}
