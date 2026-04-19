# SPEC — Ads Integration (AdMob)

## Plugin

```bash
npm install @capacitor-community/admob
npx cap sync android
```

## Setup AdMob

1. Créer compte AdMob (admob.google.com)
2. Créer app "Vampire Maxxing" (Android)
3. Récupérer App ID : `ca-app-pub-XXX~YYY`
4. Créer 1 ad unit rewarded : `ca-app-pub-XXX/ZZZ`
5. IDs de test :
   - App ID : `ca-app-pub-3940256099942544~3347511713`
   - Rewarded : `ca-app-pub-3940256099942544/5224354917`

## android/app/src/main/AndroidManifest.xml

Dans `<application>` :
```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-XXX~YYY"/>
```

## Wrapper

```ts
// src/platform/ads.ts
import { AdMob, RewardAdPluginEvents, RewardAdOptions } from '@capacitor-community/admob';

const PROD_REWARDED_ID = 'ca-app-pub-XXX/ZZZ';
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';
const IS_DEV = import.meta.env.DEV;

let initialized = false;

export async function initAds(): Promise<void> {
  if (initialized) return;
  try {
    await AdMob.initialize({
      testingDevices: IS_DEV ? ['YOUR_TEST_DEVICE_ID'] : [],
      initializeForTesting: IS_DEV,
    });
    initialized = true;
  } catch (e) {
    console.warn('AdMob init failed:', e);
  }
}

export async function showRewardedAd(adType: RewardAdType): Promise<boolean> {
  if (!initialized) await initAds();
  
  const options: RewardAdOptions = {
    adId: IS_DEV ? TEST_REWARDED_ID : PROD_REWARDED_ID,
  };
  
  try {
    await AdMob.prepareRewardVideoAd(options);
    
    return new Promise<boolean>((resolve) => {
      const rewardListener = AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        () => {
          rewardListener.remove();
          dismissListener.remove();
          failListener.remove();
          trackAdCompleted(adType);
          resolve(true);
        }
      );
      
      const dismissListener = AdMob.addListener(
        RewardAdPluginEvents.Dismissed,
        () => {
          rewardListener.remove();
          dismissListener.remove();
          failListener.remove();
          resolve(false);
        }
      );
      
      const failListener = AdMob.addListener(
        RewardAdPluginEvents.FailedToLoad,
        () => {
          rewardListener.remove();
          dismissListener.remove();
          failListener.remove();
          resolve(false);
        }
      );
      
      AdMob.showRewardVideoAd();
    });
  } catch (e) {
    console.warn('Rewarded ad failed:', e);
    return false;
  }
}

export type RewardAdType = 'summon-night' | 'embrace-dawn' | 'invoke-curse' | 'offering';

function trackAdCompleted(type: RewardAdType): void {
  // Analytics event
}
```

## Utilisation dans le jeu

### SUMMON THE NIGHT (boost 2× pendant 2 min)

```ts
async function handleSummonNight(): Promise<void> {
  const rewarded = await showRewardedAd('summon-night');
  if (rewarded) {
    triggerBoost(true);  // flag rewarded → durée 2 min au lieu de 15s
    showToast('THE NIGHT ANSWERS', 'Your power doubles for 2 minutes.');
  } else {
    showToast('THE RITE FAILED', 'No response from the void.');
  }
}
```

### EMBRACE THE DAWN (offline + 2h)

```ts
async function handleEmbraceDawn(seconds: number): Promise<void> {
  const rewarded = await showRewardedAd('embrace-dawn');
  if (rewarded) {
    const bonus = applyOfflineProgress(seconds + 7200, true); // +2h et 100% eff
    showToast('DAWN EMBRACED', `+${fmt(bonus)} blood recovered.`);
  }
}
```

### INVOKE THE CURSE (×2 Dread sur Ascend)

```ts
async function handleInvokeCurse(): Promise<void> {
  const rewarded = await showRewardedAd('invoke-curse');
  triggerAscend(rewarded ? 2 : 1);
}
```

### OFFERING (daily gift)

```ts
async function handleDailyOffering(): Promise<void> {
  const rewarded = await showRewardedAd('offering');
  if (rewarded) {
    const bonus = getTotalRate() * 600; // 10 min de prod
    state.blood += bonus;
    showToast('OFFERING ACCEPTED', `+${fmt(bonus)} blood.`);
  }
}
```

## UX rules

- **Pas d'ad avant la 2e session** (première impression clean)
- **Pas d'ad forcée.** Toutes déclenchées par action explicite joueur
- **Fallback gracieux** : si ad failed → toast "THE RITE FAILED" + option de retry plus tard
- **Timeout** : si prepareRewardVideoAd > 10s → skip et fallback

## GDPR consent (UMP)

Via `@capacitor-community/admob`, au premier lancement en EU :

```ts
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';

export async function requestAdsConsent(): Promise<void> {
  const consentInfo = await AdMob.requestConsentInfo();
  if (consentInfo.status === AdmobConsentStatus.REQUIRED) {
    await AdMob.showConsentForm();
  }
}
```

À appeler avant `initAds()`.

## Test & debug

- En dev : utilise IDs de test AdMob (toujours retourne pub test)
- Log chaque événement (requested, loaded, shown, rewarded, dismissed, failed)
- Ajouter bouton debug "RESET AD" en dev pour forcer un nouveau prepare

## Flag kill-switch

```ts
// Possibilité de désactiver toutes les pubs via remote config / settings
if (state.settings.adsDisabled) {
  return false;
}
```

Utile si on a un bug en prod ou si on ajoute un futur "ad-free" IAP.
