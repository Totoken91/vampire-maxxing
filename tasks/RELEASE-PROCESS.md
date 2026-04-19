# Release Process

## Pré-release checklist (J-1)

### Code
- [ ] `npm run lint` clean
- [ ] `npm run test` vert
- [ ] `npm run build` sans warning
- [ ] Tous les `console.log` de debug supprimés
- [ ] Tous les `TODO` critiques résolus
- [ ] Version bumpée dans `package.json` + `android/app/build.gradle` (versionCode++, versionName)

### Assets
- [ ] Les 8 portraits PNG présents et optimisés
- [ ] Les 8 thralls PNG présents et optimisés
- [ ] App icon 512×512 présente
- [ ] Feature graphic 1024×500 présente
- [ ] 8 screenshots 1080×1920 prêts

### Play Console
- [ ] App créée
- [ ] Privacy policy URL live et accessible
- [ ] Content rating complété
- [ ] Store listing EN rempli
- [ ] Store listing FR rempli
- [ ] IAP products créés et activés
- [ ] Target audience : 13+
- [ ] App access : no login required
- [ ] Ads declaration : yes (rewarded)
- [ ] Data safety form rempli

### Technical prod
- [ ] AdMob IDs prod dans le code (pas test)
- [ ] IAP product IDs corrects
- [ ] `import.meta.env.PROD` check OK
- [ ] Keystore production backup vérifié

## Build release

```bash
# Clean build
rm -rf dist/ android/app/build/

# Production build
NODE_ENV=production npm run build

# Sync Capacitor
npx cap sync android

# Generate AAB
cd android
./gradlew bundleRelease

# AAB output
ls -lh app/build/outputs/bundle/release/
# → app-release.aab
```

## Upload Internal Testing

1. Play Console → Release → **Internal testing** → Create new release
2. Upload `app-release.aab`
3. Google checks :
   - [ ] 64-bit requirement ✓
   - [ ] API level 34+ ✓
   - [ ] No debug flag ✓
4. **Release notes** :

### EN
```
Welcome to Vampire Maxxing.

You begin as a Newborn. You will become something... else.

Version 1.0.0:
- The complete idle experience with 8 vampire forms
- Ornate gothic UI
- Earn blood, summon thralls, ascend the bloodline
- Three cosmetic bloodline packs available
- Founder Pack available for the first 90 days

Your thirst is eternal.
```

### FR
```
Bienvenue dans Vampire Maxxing.

Tu commences en Nouveau-né. Tu deviendras autre chose.

Version 1.0.0 :
- L'expérience idle complète avec 8 formes vampires
- Interface gothique ornementée
- Gagne du sang, invoque des sbires, ascendance la lignée
- Trois packs cosmétiques disponibles
- Founder Pack accessible les 90 premiers jours

Ta soif est éternelle.
```

5. Save → Review release → Submit

**Délai review** : 1 à 3 jours.

## Post-upload monitoring

### Pendant review
- Installer l'AAB en local via `bundletool` pour tester une dernière fois :
  ```bash
  bundletool build-apks --bundle=app-release.aab --output=app.apks --mode=universal
  bundletool install-apks --apks=app.apks
  ```
- Jouer 10 min, vérifier qu'il n'y a pas de régression

### Après approval
- Tester via link internal testing
- Vérifier : ads s'affichent, IAP achetable, restore fonctionne
- Vérifier crash report dans Firebase Crashlytics
- Vérifier analytics dans Firebase Analytics

## Closed Testing (Alpha)

Quand Internal est stable (2-3 jours) :
1. Play Console → Release → **Closed testing** → Create new release
2. Promote le même AAB (reuse)
3. Créer un testing track "Alpha"
4. Inviter 20-50 testeurs (email list ou email groupe)
5. **Réviser** les retours pendant 7-14 jours

## Production release

Quand Alpha stable :
1. Play Console → Release → **Production** → Create new release
2. Promote le même AAB
3. **Staged rollout** : commencer à 20%
4. Monitor pendant 2-3 jours :
   - Crash rate < 1%
   - ANR rate < 0.5%
   - Rating ≥ 4.2 sur les premiers reviews
5. Augmenter à 50%, puis 100% sur 1 semaine

## Rollback d'urgence

Si bug critique en prod :
1. Play Console → halt rollout immédiatement
2. Fix le bug → nouveau versionCode
3. Build + upload en Internal
4. Puis re-promote vers Production staged rollout

## Post-launch content

### Semaine 1
- Poster 3-5 vidéos TikTok (#vampiremaxxing)
- Reddit posts : r/idlegames, r/goth, r/darkacademia
- Reply aux premiers reviews

### Semaine 2-4
- Analyser retention D1, D7, D30
- Analyser ARPDAU
- Planifier v1.1 selon feedback

### v1.1 contenu planifié
- 5 achievements supplémentaires
- 1 skin saisonnier (Halloween ou St-Valentin)
- Corrections UX prioritaires
- Nouvelle animation d'ascension pour forme haute

## Analytics clés à tracker

- **Funnel** : install → first launch → first tap → first thrall → first ascend → 2nd session
- **Retention** : D1, D7, D30
- **ARPDAU** : revenu total / DAU
- **Ad impressions / DAU**
- **IAP conversion**
- **Session length moyenne**
- **Forme atteinte par % de joueurs** (distribution)

## Support channel

- Email dédié : vampiremaxxing@[domain].com (ou reply-all to kenny@...)
- FAQ page sur kenny.quest/vampire-maxxing/faq
- Respond aux reviews Play Store sous 48h

## Communication post-release

- Update sur Twitter/X personnel
- Post dev log sur blog
- Reddit auto-introduction sur r/idlegames
- TikTok : vidéo "building my vampire idle game solo"

## Versioning futur

- `1.0.0` → release
- `1.0.1` → hotfix bugs critiques
- `1.1.0` → premier content update (achievements, balance)
- `1.2.0` → Bloodline+ subscription
- `2.0.0` → major gameplay addition (second prestige layer?)
