# SPEC — Privacy Policy Template

> URL à héberger : `https://kenny.quest/vampire-maxxing/privacy` (ou domaine dédié)

## Template en anglais

```markdown
# Privacy Policy — Vampire Maxxing

Last updated: [DATE]

Kenny ("we", "us", "our") operates the Vampire Maxxing mobile 
application (the "App"). This page informs you of our policies 
regarding the collection, use, and disclosure of personal data 
when you use our App.

## Information we collect

### 1. Automatically collected data

When you use the App, we automatically collect:
- **Device information** (model, OS version, screen size) — for 
  crash diagnostics
- **Crash reports** (stack traces, memory state at crash time) 
  via Firebase Crashlytics — to fix bugs
- **Aggregated usage analytics** (session duration, features 
  used, retention metrics) via Firebase Analytics — to improve 
  the App
- **Advertising identifiers** (AAID) via Google Play Services — 
  only used by AdMob for personalized or non-personalized ads 
  based on your consent

### 2. Data we do NOT collect

- **We do NOT collect your name, email, phone number, or real 
  identity.**
- **We do NOT collect your location.**
- **We do NOT access your contacts, photos, or files.**
- **We do NOT have server-side accounts.** All your game progress 
  is stored locally on your device.

## How we use data

- **Crash reports**: debug and fix issues
- **Analytics**: understand usage patterns to improve gameplay
- **Advertising**: AdMob uses device IDs to serve relevant 
  rewarded ads. You can opt out or choose non-personalized ads 
  via the in-app consent flow.

## Third-party services

The App uses the following third-party services:

- **Google AdMob** (advertising) — [AdMob Privacy Policy](https://policies.google.com/privacy)
- **Google Play Billing** (in-app purchases) — [Google Privacy](https://policies.google.com/privacy)
- **Firebase (Analytics, Crashlytics)** — [Firebase Privacy](https://firebase.google.com/support/privacy)

## Children's privacy

The App is **rated 13+** and is **not intended for children under 
13**. We do not knowingly collect data from children under 13. 
If you are a parent and aware of your child using the App, 
please contact us.

## Your rights (GDPR / European users)

Under GDPR, you have the right to:
- Access the data we process about you
- Request deletion of your data
- Withdraw consent for ads at any time (via in-app settings)
- Object to processing
- Data portability

To exercise these rights, contact us at [EMAIL].

## Your rights (CCPA / California users)

Under CCPA, you have the right to:
- Know what personal information we collect
- Request deletion of personal information
- Opt out of the sale of personal information (we do NOT sell 
  personal information)

## Data retention

- **Local game data**: stored on your device until you uninstall 
  the App or reset game progress in settings
- **Crash/analytics data**: retained by Firebase for up to 90 days
- **AdMob data**: per Google's retention policies

## Data security

Your game progress is stored locally on your device. We apply 
reasonable security measures to third-party services we use, 
but no system is 100% secure.

## Changes to this policy

We may update this Privacy Policy. Changes will be reflected on 
this page with a new "Last updated" date. Material changes will 
be notified in-app.

## Contact

For any privacy-related question:
- Email: [EMAIL]
- Developer: Kenny (solo developer)
- App website: kenny.quest/vampire-maxxing

By using Vampire Maxxing, you consent to this Privacy Policy.
```

## Template en français

Suivre la même structure. Traduction intégrale à préparer avant release.

## Hébergement

- Option simple : une page HTML statique sur `kenny.quest/vampire-maxxing/privacy`
- Option future : domain dédié `vampiremaxxing.app/privacy`

## Play Console

Lien à fournir dans Play Console → Policy → Privacy Policy → URL.

## Dans l'app

Dans les settings, lien **"Privacy Policy"** qui ouvre le navigateur via `Browser.open({ url })` (`@capacitor/browser`).

## Mises à jour

À chaque ajout d'une feature collectant de nouvelles données (ex: cloud save v2), **update la policy** et notifier in-app.

## Consent flow (première session)

Au premier lancement dans l'EU :
1. Splash screen
2. Modal : "To serve relevant ads, we use device identifiers. Do you accept personalized ads?"
3. Options : "YES" / "NON-PERSONALIZED" / "LEARN MORE"
4. Si "LEARN MORE" → ouvre privacy policy + AdMob Consent Form (UMP)

Le consent est stocké en persistent storage et relu à chaque lancement.
