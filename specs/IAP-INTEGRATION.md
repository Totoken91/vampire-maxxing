# SPEC — IAP Integration (Google Play Billing)

## Plugin

```bash
npm install @capacitor-community/in-app-purchases
npx cap sync android
```

## Play Console setup

1. Ouvrir Google Play Console → app Vampire Maxxing → **Monetize → Products → In-app products**
2. Créer 4 produits managed (non-consumable) :
   - `skin_nosferatu` — 2.99€ — "Nosferatu Skin Pack" — *The original nightmare.*
   - `skin_crimson` — 2.99€ — "Crimson Court Skin Pack" — *Opulence. Decadence. Eternity.*
   - `skin_void` — 2.99€ — "Void Cult Skin Pack" — *Reality was never a promise.*
   - `founder_pack` — 9.99€ — "Founder Pack" — *Among the first to awaken.* (inclut les 3 skins + titre)

3. Activer, uploader des icônes 512×512.

## Wrapper

```ts
// src/platform/iap.ts
import { InAppPurchases, Product } from '@capacitor-community/in-app-purchases';

export type SkinId = 'default' | 'nosferatu' | 'crimson' | 'void';

const PRODUCT_IDS = {
  skin_nosferatu: 'nosferatu',
  skin_crimson:   'crimson',
  skin_void:      'void',
  founder_pack:   'founder',
} as const;

type ProductKey = keyof typeof PRODUCT_IDS;

let initialized = false;
let products: Product[] = [];

export async function initIAP(): Promise<void> {
  if (initialized) return;
  
  try {
    await InAppPurchases.initialize();
    
    const result = await InAppPurchases.getProducts({
      productIdentifiers: Object.keys(PRODUCT_IDS),
    });
    products = result.products;
    
    // Check entitlements on init
    await restorePurchases();
    
    initialized = true;
  } catch (e) {
    console.warn('IAP init failed:', e);
  }
}

export function getProducts(): Product[] {
  return products;
}

export function getProductPrice(id: ProductKey): string {
  return products.find((p) => p.productId === id)?.price ?? '—';
}

export async function purchase(id: ProductKey): Promise<boolean> {
  try {
    const result = await InAppPurchases.purchaseProduct({ productId: id });
    if (result.transactionState === 'purchased') {
      applyPurchase(id);
      return true;
    }
  } catch (e) {
    console.warn('Purchase failed:', e);
  }
  return false;
}

export async function restorePurchases(): Promise<void> {
  try {
    const result = await InAppPurchases.restorePurchases();
    for (const t of result.transactions) {
      if (t.transactionState === 'restored' || t.transactionState === 'purchased') {
        applyPurchase(t.productId as ProductKey);
      }
    }
  } catch (e) {
    console.warn('Restore failed:', e);
  }
}

function applyPurchase(id: ProductKey): void {
  if (id === 'founder_pack') {
    unlockSkin('nosferatu');
    unlockSkin('crimson');
    unlockSkin('void');
    setFounder(true);
    showToast('FOUNDER STATUS', 'You are among the first to awaken.');
  } else {
    const skin = PRODUCT_IDS[id] as SkinId;
    unlockSkin(skin);
    showToast('SKIN UNLOCKED', `The ${skin} bloodline is yours.`);
  }
}
```

## Store UI (Apothecary modal)

```ts
// src/ui/components/store-modal.ts
export class StoreModal extends Component {
  // Layout :
  // ┌─────────────────────────────────────┐
  // │          APOTHECARY                 │
  // │                                     │
  // │  ┌─────────┐ ┌─────────┐ ┌────────┐ │
  // │  │ NOSFER. │ │ CRIMSON │ │  VOID  │ │
  // │  │ preview │ │ preview │ │preview │ │
  // │  │ "The    │ │ "Opu... │ │"Real..."│ │
  // │  │ originl"│ │         │ │        │ │
  // │  │  2.99€  │ │  2.99€  │ │ 2.99€  │ │
  // │  └─────────┘ └─────────┘ └────────┘ │
  // │                                     │
  // │  ┌─────────────────────────────┐   │
  // │  │   FOUNDER PACK (limited)    │   │
  // │  │   All 3 skins + title        │   │
  // │  │   9.99€                      │   │
  // │  └─────────────────────────────┘   │
  // │                                     │
  // │     RESTORE PURCHASES               │
  // └─────────────────────────────────────┘
  
  private renderSkinCard(skin: SkinId): HTMLElement {
    const card = el('div', { class: 'skin-card' });
    // Preview du portrait avec ce skin appliqué (utilise lord-of-night comme représentatif)
    // Titre, tagline, prix
    // Bouton acheter ou "OWNED" si déjà possédé
    return card;
  }
}
```

## Apply skin live

Quand un skin est actif :

```ts
// Dans state
state.skin = 'crimson';

// Dans portrait.ts
const src = getFormPortraitPath(currentForm, state.skin);
// → /assets/portraits/crimson/lord-of-night.png
```

Voir `docs/07-ASSETS-GUIDE.md` pour la structure des chemins de skins.

## Testing

Mode debug : un toggle en settings "UNLOCK ALL SKINS" qui simule les IAP pour tester visuellement sans payer.

## Security note

Les purchases sont validés côté Google Play (signature automatique du plugin). Pas besoin de backend pour la validation au MVP. En v1.1+, on ajoutera validation server-side via Firebase si volume suffisant.

## Restore flow

- Bouton "RESTORE PURCHASES" en bas du store
- Aussi appelé automatiquement à l'init
- Aussi appelé quand le joueur change de device (manual trigger)

## Founder Pack limitation

Le Founder Pack n'est **visible que pendant 90 jours** après le premier lancement de l'app.

```ts
function isFounderPackAvailable(): boolean {
  const firstLaunch = state.stats.firstLaunch;
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  return Date.now() - firstLaunch < ninetyDaysMs;
}
```

Après 90 jours, le Founder Pack disparaît du store même pour le joueur qui n'a pas acheté. Créé un sens d'urgence authentique (sans manipulative timer).

## Event tracking

```ts
// Analytics events
trackPurchaseInitiated(productId);
trackPurchaseCompleted(productId, price);
trackPurchaseFailed(productId, reason);
trackRestoreTriggered();
```
