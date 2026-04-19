# SPEC — Build Android

## Prérequis

- Node 20 LTS
- JDK 17
- Android Studio (dernier stable)
- Android SDK 34 (API 34, Android 14)
- Gradle 8.x (bundlé avec Android Studio)

## Init Capacitor Android

```bash
# Déjà init via Vite
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init

# Configure capacitor.config.ts (voir TECH-STACK.md)
# appId: quest.kenny.vampiremaxxing
# appName: Vampire Maxxing

# Add android platform
npx cap add android

# Build web + sync
npm run build
npx cap sync android

# Open in Android Studio
npx cap open android
```

## capacitor.config.ts

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'quest.kenny.vampiremaxxing',
  appName: 'Vampire Maxxing',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#08050a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#08050a',
    },
  },
};

export default config;
```

## android/app/build.gradle

```groovy
android {
  namespace "quest.kenny.vampiremaxxing"
  compileSdk 34

  defaultConfig {
    applicationId "quest.kenny.vampiremaxxing"
    minSdkVersion 26  // Android 8+
    targetSdkVersion 34
    versionCode 1
    versionName "1.0.0"
  }

  buildTypes {
    release {
      minifyEnabled true
      shrinkResources true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
      signingConfig signingConfigs.release
    }
  }
}
```

## Signing (release)

1. Générer keystore :
```bash
keytool -genkey -v -keystore vampire-maxxing-release.keystore \
  -alias vampire-maxxing -keyalg RSA -keysize 2048 -validity 10000
```

2. **IMPORTANT** : backup le keystore + password dans Bitwarden. Perte = impossible de mettre à jour l'app sur Play Store.

3. Créer `android/keystore.properties` (ignoré par git) :
```
storeFile=../../vampire-maxxing-release.keystore
storePassword=XXX
keyAlias=vampire-maxxing
keyPassword=XXX
```

4. Dans `android/app/build.gradle` :
```groovy
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
  keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
  signingConfigs {
    release {
      keyAlias keystoreProperties['keyAlias']
      keyPassword keystoreProperties['keyPassword']
      storeFile file(keystoreProperties['storeFile'])
      storePassword keystoreProperties['storePassword']
    }
  }
}
```

5. Ajouter au `.gitignore` :
```
android/keystore.properties
*.keystore
*.jks
```

## Build release AAB

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

AAB = Android App Bundle (format requis par Play Store). Google Play génère les APK optimisés par device.

## Play Console setup

1. **play.google.com/console** → Create app
2. Nom : Vampire Maxxing
3. Default language : English (US), ajouter French
4. App or game : **Game**
5. Free / Paid : **Free**
6. Category : **Casual → Idle**

### Content rating (PEGI 12+)

Questionnaire IARC :
- Violence : moderate (fangs, blood motifs symboliques, pas de gore réaliste)
- Sexual content : none
- Language : none
- Fear : mild (gothic themes)
- Gambling : none (pas de loot box aléatoire)
- Drugs : none

### Target audience

**13+** (pas de feature "for kids"). Le thème vampire + blood écarte naturellement le rating family-friendly.

### Store listing

- **Title** (30 chars) : `Vampire Maxxing`
- **Short description** (80 chars) : `Evolve your vampire. Rise in the bloodline. An idle game of eternal hunger.`
- **Full description** (4000 chars) : voir `store-assets/description.md` (à créer)
- **Feature graphic** : 1024×500 PNG/JPG (écran du jeu avec titre)
- **Screenshots** : 8 écrans différents (phone portrait, 1080×1920)
  - Screen 1 : écran principal en forme ELDER
  - Screen 2 : écran principal en forme LORD OF NIGHT
  - Screen 3 : écran principal en forme TERA OVERLORD
  - Screen 4 : ascension modal avec transition
  - Screen 5 : thrall list avec tous débloqués
  - Screen 6 : Apothecary (store) avec les 3 skins
  - Screen 7 : achievement unlock toast mémé
  - Screen 8 : offline gain modal
- **Icon** : 512×512 (utilise une variante du portrait Lord of Night dans un cadre ornemental)

## Upload releases

### Internal testing (d'abord)

1. Play Console → Release → Internal testing → Create release
2. Upload `app-release.aab`
3. Release notes : en EN et FR
4. Add testers (emails manuels) OU créer groupe "internal-testers"
5. Submit for review (1-3 jours)

### Closed testing (Alpha) — optionnel

Groupe de 20-100 testeurs early. Permet d'accumuler des reviews avant de passer en production.

### Production release

Une fois validé en internal / closed :
1. Play Console → Release → Production → Create release
2. Reuse AAB ou upload nouveau
3. Staged rollout : commencer à 20%, monter à 100% sur 1 semaine si pas de crash spike

## Build debug pour tests physiques

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
adb install app-debug.apk
```

## Logs device

```bash
adb logcat | grep -i capacitor
adb logcat | grep -i vampire
```

## Checklist avant release

- [ ] Version code et name bumped
- [ ] Mode prod : IDs AdMob prod, pas test
- [ ] Mode prod : IDs IAP prod, pas sandbox
- [ ] `console.log` cleanés
- [ ] Tests manuels sur device physique (pas juste émulateur)
- [ ] Test sur device mid-range (Snapdragon 665 class, 4GB RAM)
- [ ] Test offline → online transition
- [ ] Test background → foreground (save correct)
- [ ] Test des 8 portraits chargent correctement
- [ ] Test transition de forme (NEWBORN → ELDER au moins)
- [ ] Test ascension FX (cinematic)
- [ ] Test restore purchases
- [ ] Privacy policy URL live
- [ ] Signed keystore backup OK

## Versioning

Format : `MAJOR.MINOR.PATCH` (1.0.0)
- MAJOR : refonte majeure, gameplay change
- MINOR : nouveaux contenus (skins, achievements, events)
- PATCH : bugfix, polish

`versionCode` : incrémenter à chaque upload. Jamais redescendre.

## Temps attendus

- Premier build debug : ~2-3 min
- Build incremental debug : ~30s
- Build release AAB : ~3-4 min
- Sync Capacitor : ~5s
- Install sur device : ~10-20s

## Issues fréquentes

- **"Failed to resolve: androidx.core:..."** : `cd android && ./gradlew clean`
- **Module not found** : `npx cap sync android`
- **Splash screen qui reste bloqué** : vérifier `SplashScreen` config dans capacitor.config.ts
- **Background color blanc au lancement** : setter `backgroundColor` dans `android/app/src/main/res/values/styles.xml`
