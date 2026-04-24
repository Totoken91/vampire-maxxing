# 10 — Thrall Roster v1.0 (MVP Launch)

> 12 thralls pour le launch : **6 Commons + 4 Rares + 2 Epics**. Zéro Legendary au lancement (v1.1). Les 3 Legendaries actuellement dans `src/game/config/thralls.ts` (Lord of Night, Blood Countess, Crimson Reaper) restent en code avec flag `v1_1Preview: true` → affichés en silhouette verrouillée "v1.1 coming" dans le Sanctum (tease).
>
> **Archétypes mécaniques** :
> - **Harvester** → bonus sur la génération de Blood passive
> - **Nocturne** → bonus sur les gains offline et/ou le cap offline
> - **Predator** → bonus sur les gains actifs (session + tap)
> - **Hybrid** → bonus réparti sur plusieurs sources
>
> **Target répartition par banner** :
> - Rituel Ancien (Standard) : les 12 thralls, rates 82/15/3
> - Rituel Invoqué (Featured v1.0) : les 12 + rate-up sur **Mirella** (featured fixe au launch)

---

## Quick reference

| # | Nom | Rareté | Archétype | Primary | Secondary | Portrait |
|---|---|---|---|---|---|---|
| 1 | Ash the Wretched | Common | Harvester | +8% Blood gen | — | ❌ **missing** |
| 2 | Mira the Watcher | Common | Nocturne | +12% offline | Cap offline 2h | ❌ **missing** |
| 3 | Roderick the Tracker | Common | Predator | +10% active | — | ❌ **missing** |
| 4 | Iron Maw | Common | Harvester | +6% Blood gen | −2% prestige cost | ❌ **missing** |
| 5 | Crypt Warden | Common | Nocturne | +10% offline | +5% cap offline time | ❌ **missing** |
| 6 | Gravebound | Common | Predator | +8% active | Tap ×1.1 | ❌ **missing** |
| 7 | Nox the Hunger | Rare | Harvester | +25% Blood gen | — | ✅ owned |
| 8 | Lilith's Whisper | Rare | Nocturne | +30% offline | Cap étendu 4h | ❌ **missing** |
| 9 | Duskward | Rare | Predator | +22% active | Haptic spécial au tap | ❌ **missing** |
| 10 | Ashen Vale | Rare | Hybrid | +15% toutes sources | Débloque slot actif +1 | ✅ owned |
| 11 | Mirella, Thorn of the Court | Epic | Harvester | +60% Blood gen | Particles roses sang au tap | ✅ owned |
| 12 | Velmor the Dread | Epic | Nocturne | +80% offline | Cap 8h + auto-collect unlock | ✅ owned |

**Tally assets pending** : 8 portraits à générer (6 Commons + Lilith + Duskward).

---

## ⭐ Système d'étoiles (rappel)

Multiplicateurs appliqués au primary + secondary effect.

| Rareté | 1★ | 2★ | 3★ | 4★ | 5★ | Total essences pour 5★ |
|---|---|---|---|---|---|---|
| Common | 1.00 | 1.25 | 1.50 | 1.75 | 2.00 | 45 |
| Rare | 1.00 | 1.375 | 1.75 | 2.125 | 2.50 | 30 |
| Epic | 1.00 | 1.50 | 2.00 | 2.50 | 3.00 | 15 |

Exemple : Mirella à 5★ → +60% × 3.0 = **+180% Blood gen**.

---

## 🎨 Direction artistique générale (applicable à tous les portraits)

**Style** : dark romantic oil painting, gothic premium mobile game, "luxurious grimoire" aesthetic — mélange Interview with the Vampire (2022) + Nosferatu (2024) + Alphonse Mucha.

**Composition (strict)** :
- **Framing serré** sur le **visage + haut du buste** (épaules visibles, pas plus bas).
- Portrait 3/4 face ou face, regard direct vers le spectateur ou légèrement oblique.
- Format **480 × 721 px**, WebP q86, fond transparent OU fond sombre uni qui se fondra dans le cadre PNG baroque.
- **Pas de ceinture/taille/main/accessoire bas** visible — la carte clippe à ~80% de hauteur, tout ce qui est sous la clavicule sera masqué par le cartouche du nom.

**Palette** :
- Peaux pâles à nacrées (jamais hâlées sauf note spécifique)
- Accents **rouge sang** subtils (un filet de sang sur lèvre, un rubis, un liseré) — mais pas dominants
- **Gold baroque** en bijoux/broderie uniquement si le statut le justifie (Epics et Rares plus riches, Commons plus dépouillés)
- Ombres pourpres (#6b2d8f) et or (#c9a962) dans les highlights
- **Fond** : sombre, vignetté, hors-focus. Jamais de paysage identifiable. Évoquer crypte, velours noir, nuit brumeuse.

**À éviter absolument** :
- Anime / chibi / cel-shading / cartoon
- Sourires Disney, expressions "marketing"
- Accessoires modernes (gun, piercings contemporains, makeup glitter)
- Personnages grimaçants / gore explicite (le jeu est PEGI 12+ target)

**Ton général** : regards lourds, lèvres fermées ou entrouvertes, atmosphère mélancolique ou dangereuse. Un non-joueur qui regarde la carte doit penser *"ce personnage a 400 ans et s'ennuie"*.

---

## 🔴 COMMONS (6) — les plus "humains", tenues simples

### 1. Ash the Wretched

- **Rareté** : Common | **Archétype** : Harvester
- **Lore** : *"He still remembers his own name. The others pretend they have forgotten theirs."*
- **Effect primary** : +8% Blood generation
- **Star target 5★** : +16% Blood gen

**Visual prompt** :
> Portrait of a frail pale man, late twenties, sunken cheeks, dark circles under ice-grey eyes, ash-blond hair messy and falling over his forehead. Tattered grey linen shirt, collar torn, thin silver chain visible around neck. Skin cracked like dry parchment on temples. A single thin line of dried blood on his lower lip. Shoulders hunched, expression resigned — not defiant. Dark background with subtle purple fog. Oil painting, Interview with the Vampire aesthetic, baroque lighting from the left, framed tight from mid-chest to top of head. 3/4 face, eyes locked on viewer. Gothic, dark academia, premium mobile game card art.

---

### 2. Mira the Watcher

- **Rareté** : Common | **Archétype** : Nocturne
- **Lore** : *"She sleeps with one eye open. The other is watching you."*
- **Effect primary** : +12% offline gains
- **Effect secondary** : Cap offline 2h (extension du cap global)
- **Star target 5★** : +24% offline, cap +4h

**Visual prompt** :
> Portrait of a young woman, pale olive skin, shoulder-length raven-black hair framing an angular face, heavy-lidded dark green eyes that seem half-asleep but intensely alert. High-collared dark grey linen gown with a single dull silver pin at the throat. Faint crescent moon pendant. No smile, mouth closed, chin slightly tilted down so she looks up at the viewer through her lashes — predatory stillness. Dark background, moonlit rim-light from behind her head. Oil painting, Nosferatu 2024 aesthetic, tight framing chest-up, face centered. Gothic premium card art.

---

### 3. Roderick the Tracker

- **Rareté** : Common | **Archétype** : Predator
- **Lore** : *"He does not chase. The quarry always comes to him, eventually."*
- **Effect primary** : +10% active session gains
- **Star target 5★** : +20%

**Visual prompt** :
> Portrait of a lean man in his thirties, weathered pale skin, trimmed dark auburn beard, sharp cheekbones, amber-hazel eyes with a hungry intensity. Dark leather riding coat with brass buckles at the collar, high stand-up collar, a small scar splitting his left eyebrow. Hair pulled back loosely. A single drop of blood at the corner of his mouth — fresh, not dried. Mouth slightly open, teeth not visible. Confident, still, predator-calm. Dark background with hint of bare winter branches silhouetted. Oil painting, dark romantic, baroque lighting from the right. Tight framing chest-up, 3/4 face, eyes on viewer. Gothic premium card art.

---

### 4. Iron Maw

- **Rareté** : Common | **Archétype** : Harvester
- **Lore** : *"What she bites, she keeps. What she keeps, she breaks."*
- **Effect primary** : +6% Blood generation
- **Effect secondary** : −2% prestige (Ascend) cost
- **Star target 5★** : +12% Blood gen, −4% cost

**Visual prompt** :
> Portrait of a stocky middle-aged woman, ashen pale skin, square jaw, short-cropped iron-grey hair, piercing steel-blue eyes. A dull bronze cage-like metal plate covers the lower half of her face like a medieval scold's bridle, but the straps are loose and decorative — ceremonial, not punitive. Heavy black wool cloak with a tarnished copper clasp. Neck scarred, old wounds. Unsmiling, glaring directly at the viewer. Dark background with deep red undertone. Oil painting, gothic, Ex-libris XIXe engraving sensibility, tight framing chest-up. Premium mobile card art, not gore.

---

### 5. Crypt Warden

- **Rareté** : Common | **Archétype** : Nocturne
- **Lore** : *"His lantern has not been lit since the mortals stopped coming."*
- **Effect primary** : +10% offline gains
- **Effect secondary** : +5% cap offline time (additive)
- **Star target 5★** : +20% offline, +10% cap time

**Visual prompt** :
> Portrait of an elderly thin man, hollow-cheeked, paper-white skin, long white hair pulled tight behind his head, pale grey cataract-tinted eyes. Faded black ecclesiastical cassock with tarnished silver stitching at the collar, small iron key on a chain. Deep creases around the eyes. Holds no object (only head and shoulders visible). Expression: weary vigilance. Dark background with a faint cold blue undertone, as if lit by distant moonlight through a vault. Oil painting, gothic, Aubrey Beardsley-influenced contrasts. Tight framing chest-up, face-on, eyes locked on viewer. Premium mobile card art.

---

### 6. Gravebound

- **Rareté** : Common | **Archétype** : Predator
- **Lore** : *"The soil remembers her even when she forgets herself."*
- **Effect primary** : +8% active gains
- **Effect secondary** : Tap ×1.1
- **Star target 5★** : +16% active, tap ×1.2

**Visual prompt** :
> Portrait of a young woman, very pale, almost grey-tinted skin with faint dark earth smudges on one cheek and forehead. Tangled dark brown hair with a few pieces of dry grass and a single dead leaf caught in it. Wide violet-grey eyes with dilated pupils. Torn dark linen dress with a deep square neckline, rough stitched seams, tarnished copper brooch. One shoulder bare. Mouth slightly parted, breath visible as faint fog. Freshly risen — disoriented but awake. Dark earthy background, hint of bare roots or grave-dirt texture out of focus. Oil painting, dark romantic, Nosferatu 2024 aesthetic, tight framing chest-up. Gothic premium card art.

---

## 🟣 RARES (4) — plus riches, posture plus assurée

### 7. Nox the Hunger ✅

- **Rareté** : Rare | **Archétype** : Harvester
- **Lore** : *"She feeds not on blood but on memory of blood — and grows fat where others starve."*
- **Effect primary** : +25% Blood generation (rebalancé V1.2 depuis +8%)
- **Star target 5★** : +62.5%
- **Portrait actuel** : `/assets/thralls/nox-the-hunger.webp` — conservé.

---

### 8. Lilith's Whisper

- **Rareté** : Rare | **Archétype** : Nocturne
- **Lore** : *"Her voice arrives in dreams three nights before she does. By then it is already too late."*
- **Effect primary** : +30% offline gains
- **Effect secondary** : Cap offline étendu à 4h (override)
- **Star target 5★** : +75% offline

**Visual prompt** :
> Portrait of a stunning pale woman in her apparent late twenties, porcelain skin, full dark crimson lips slightly parted, long jet-black hair falling in smooth waves over bare shoulders. Deep violet-black eyes, impossibly large pupils, eyeliner smudged to suggest sleeplessness but elegant. Wears a deep burgundy silk robe with gold baroque embroidery at the edge, draped low off one shoulder. A thin gold chain with a single dark ruby droplet at her collarbone. Faint whisper-pale scarring on one side of her neck. Expression: knowing, half-amused, sexually mesmerizing but not cartoonish. Dark background with soft purple and gold fog, blurred candle glow behind. Oil painting, Alphonse Mucha × Interview with the Vampire, baroque Mucha-like ornamental light. Tight framing chest-up, 3/4 face. Premium mobile card art.

---

### 9. Duskward

- **Rareté** : Rare | **Archétype** : Predator
- **Lore** : *"He walks the last hour of daylight without flinching. He has made peace with it."*
- **Effect primary** : +22% active session gains
- **Effect secondary** : Unique haptic feedback on tap (game-side, visual signal only on card = a very faint golden crack around his silhouette)
- **Star target 5★** : +55% active

**Visual prompt** :
> Portrait of a tall lean man, late thirties, sharply handsome, pale but sun-kissed skin (unusual for a vampire — subtle golden undertone as if he refuses to let the sun go), closely cropped dark brown hair with grey at the temples, piercing copper-gold eyes. Dark charcoal wool greatcoat with a wide fur-trimmed collar, high stand-up neck. Subtle fine golden filigree crack-like marks running from his jaw down his neck like ivy veins — ornamental, glowing faintly. A single gold ring visible on his middle finger (if hand fits framing; otherwise omit). Mouth closed in a hard line, jaw set. Dark background with a thin horizon line of amber dusk light, blurred. Oil painting, dark romantic, baroque lighting warm-cold contrast. Tight framing chest-up, face-on, intense stare. Gothic premium card art.

---

### 10. Ashen Vale ✅

- **Rareté** : Rare | **Archétype** : Hybrid
- **Lore** : *"Twice buried, thrice returned. The ash on his shoulders is from his own pyre."*
- **Effect primary** : +15% toutes sources (Blood + offline + active)
- **Effect secondary** : Débloque 1 slot actif supplémentaire (effectif seulement si équipé)
- **Star target 5★** : +37.5% toutes sources
- **Portrait actuel** : `/assets/thralls/ashen-vale.webp` — conservé.

---

## 🟡 EPICS (2) — les plus ornés, aura visible

### 11. Mirella, Thorn of the Court ✅

- **Rareté** : Epic | **Archétype** : Harvester
- **Lore** : *"A courtier with no court left. She smiles like a wound remembering."*
- **Effect primary** : +60% Blood generation (rebalancé V1.2 depuis +15%)
- **Effect secondary** : Rose-blood particles au tap (visual juice only)
- **Star target 5★** : +180% Blood gen
- **Featured au launch** (rate-up sur Rituel Invoqué).
- **Portrait actuel** : `/assets/thralls/mirella.webp` — conservé.

---

### 12. Velmor the Dread ✅

- **Rareté** : Epic | **Archétype** : Nocturne
- **Lore** : *"Sleeps an age between breaths. Even his absence collects interest."*
- **Effect primary** : +80% offline gains (rebalancé V1.2 depuis +15%)
- **Effect secondary** : Cap offline étendu à 8h + débloque auto-collect (player does not have to tap claim button on return)
- **Star target 5★** : +240% offline
- **Portrait actuel** : `/assets/thralls/velmor-the-dread.webp` — conservé.

---

## 🔒 v1.1 Legendaries (silhouettes verrouillées dans Sanctum)

Visibles en `?` silhouette avec label *"v1.1 — The Bloodline Answers"*. Tap → modal teaser "Coming in next update".

### Lord of Night (v1.1, featured du patch)
- **Rareté** : Legendary | **Archétype** : Harvester
- **Effect primary target** : +150% Blood generation
- Portrait déjà en code (`/assets/thralls/lord-of-night.webp`) → utilisé tel quel pour la silhouette pré-teaser (assombri + filter).

### Blood Countess (v1.1)
- **Rareté** : Legendary | **Archétype** : Nocturne
- **Effect primary target** : +180% offline gains
- Portrait déjà en code (`/assets/thralls/blood-countess.webp`).

### Crimson Reaper (v1.2+)
- **Rareté** : Legendary | **Archétype** : Predator
- Plus loin dans la roadmap (pas dans le 1er patch Legendaries).
- Portrait déjà en code (`/assets/thralls/crimson-reaper.webp`).

---

## ✅ Action items pour Kenny

1. **Générer les 8 portraits manquants** (priorité haute, débloque L7 + L8) :
   - Commons : Ash, Mira, Roderick, Iron Maw, Crypt Warden, Gravebound
   - Rares : Lilith's Whisper, Duskward
2. Format cible : **480 × 721 px WebP q86**, fond sombre uni ou transparent, cadrage serré visage + haut du buste.
3. Nommage : `/assets/thralls/<id>.webp` avec `id` en kebab-case (ex: `lilith-s-whisper.webp`, `iron-maw.webp`).
4. Enregistrer dans `scripts/prepare-assets.mjs` à côté des 4 existants.

Tant que les portraits ne sont pas livrés : L7 génère des cartes en silhouette générique pour ces 8 slots, le jeu reste jouable, les pulls renvoient les thralls par ID/stats même sans portrait (fallback silhouette).

---

Dernière mise à jour : 2026-04-24
