// RITES — rewarded ads framed as gothic rituals, not as monetization.
// Four cards, each a standalone rite. Cards that require a native AdMob
// context are visibly disabled on web with an explanatory sub-line.

import { el } from '../../utils/dom';
import { adsAvailable, showRewarded, type RewardAdType } from '../../platform/ads';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { BALANCE } from '../../game/config/balance';
import { showToast } from '../components/toast';
import { fmt } from '../../utils/format';
import { OFFERING_COOLDOWN_SEC } from '../../game/rites';
import { grantIchor } from '../../game/ichor';
import { track } from '../../analytics/events';

function formatCooldown(sec: number): string {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (sec >= 60) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${sec}s`;
}

interface RiteSpec {
  id: RewardAdType;
  title: string;
  subtitle: string;
  flavor: string;
  reward: string;
  icon: string;
  canRun: () => { ok: boolean; reason?: string };
  onReward: () => void;
}

export class RitesTab {
  private readonly root: HTMLElement;
  private readonly teardowns: Array<() => void> = [];
  private readonly cards = new Map<RewardAdType, HTMLButtonElement>();
  private readonly subtitles = new Map<RewardAdType, HTMLElement>();
  private readonly emptyState: HTMLElement;

  constructor() {
    this.root = el('div', 'tab-view tab-view--rites');

    const head = el('header', 'tab-head');
    head.appendChild(el('div', 'tab-head__label', '— the rites —'));
    head.appendChild(el('h1', 'tab-head__title', 'RITES'));
    head.appendChild(
      el(
        'div',
        'tab-head__sub',
        adsAvailable()
          ? 'Offer a brief communion. The void rewards the patient.'
          : 'Rites available on device.',
      ),
    );
    this.root.appendChild(head);

    const list = el('div', 'rites-list');

    this.emptyState = el(
      'div',
      'rites-empty',
      'Rites awaken as your power grows.',
    );
    this.emptyState.hidden = true;

    for (const rite of this.getRites()) {
      const card = el('button', 'rite-card') as HTMLButtonElement;
      card.type = 'button';

      const icon = el('div', 'rite-card__icon');
      icon.textContent = rite.icon;

      const body = el('div', 'rite-card__body');
      body.appendChild(el('div', 'rite-card__title', rite.title));
      const sub = el('div', 'rite-card__sub', rite.subtitle);
      body.appendChild(sub);
      body.appendChild(el('div', 'rite-card__flavor', rite.flavor));

      const reward = el('div', 'rite-card__reward', rite.reward);

      card.appendChild(icon);
      card.appendChild(body);
      card.appendChild(reward);

      card.addEventListener('click', () => void this.perform(rite));

      list.appendChild(card);
      this.cards.set(rite.id, card);
      this.subtitles.set(rite.id, sub);
    }

    this.root.appendChild(list);
    this.root.appendChild(this.emptyState);
  }

  mountTo(parent: HTMLElement): void {
    parent.appendChild(this.root);
    this.render();
    this.teardowns.push(
      events.on('tick', () => this.render()),
      events.on('rate-changed', () => this.render()),
      events.on('form-changed', () => this.render()),
    );
  }

  destroy(): void {
    for (const t of this.teardowns) t();
    this.teardowns.length = 0;
    this.root.remove();
  }

  private getRites(): RiteSpec[] {
    return [
      {
        id: 'summon-night',
        title: 'Summon the Night',
        subtitle: `${BALANCE.BOOST_MULTIPLIER}× for ${Math.floor(BALANCE.BOOST_DURATION_REWARDED_SEC / 60)}m`,
        flavor: 'A longer hunt. The hours bend to your appetite.',
        reward: `${BALANCE.BOOST_MULTIPLIER}×`,
        icon: '\u2720', // ✠
        canRun: () => {
          if (gameState.get().boost.active) {
            return { ok: false, reason: 'Already coursing through your veins.' };
          }
          return { ok: true };
        },
        onReward: () => {
          gameState.activateBoost(true);
          showToast('THE NIGHT ANSWERS', 'Your power doubles for 2 minutes.');
        },
      },
      {
        id: 'offering',
        title: 'Offering',
        subtitle: '10 minutes of tribute, instantly',
        flavor: 'The thralls toil unseen. You reap what they gathered.',
        reward: '+10m',
        icon: '\u2625', // ☥
        canRun: () => {
          if (gameState.getTotalRate() <= 0) {
            return { ok: false, reason: 'Recruit a thrall before you can tithe.' };
          }
          const cd = gameState.riteCooldownSec('offering', OFFERING_COOLDOWN_SEC);
          if (cd > 0) {
            return { ok: false, reason: `Available in ${formatCooldown(cd)}.` };
          }
          return { ok: true };
        },
        onReward: () => {
          const gain = gameState.getTotalRate() * 600; // 10 minutes
          gameState.applyOfflineGain(gain);
          gameState.markRiteUsed('offering');
          showToast('OFFERING ACCEPTED', `+${fmt(gain)} blood.`);
        },
      },
      {
        id: 'invoke-curse',
        title: 'Invoke the Curse',
        subtitle: 'Double Dread on your next Ascend',
        flavor: 'Mark the ritual. The next ascension pays twice.',
        reward: '×2',
        icon: '\u269A', // ⚚
        canRun: () => {
          if (gameState.getPendingCurseMult() > 1) {
            return { ok: false, reason: 'The curse is already upon you.' };
          }
          if (gameState.getPrestigeCount() < 1) {
            return { ok: false, reason: 'Awakens after your first ascension.' };
          }
          return { ok: true };
        },
        onReward: () => {
          gameState.armCurse(2);
          showToast('THE CURSE TAKES HOLD', 'Next ascension pays twice in Dread.');
        },
      },
      {
        id: 'embrace-dawn',
        title: 'Embrace the Dawn',
        subtitle: 'Offline bonus available at next return',
        flavor: 'Let the sun pass. You gather what the night missed.',
        reward: '+2h',
        icon: '\u2600', // ☀
        canRun: () => ({
          ok: false,
          reason: 'Offered when you return after a long sleep.',
        }),
        onReward: () => {
          // Real trigger lives in the offline modal.
        },
      },
      // L12 — V1.2 spec rites: daily Ichor (Offrande du Soir) +
      // Frisson (pity bump after the next Common pull, 1×/prestige).
      {
        id: 'offrande-du-soir',
        title: 'Evening Tribute',
        subtitle: '+1 Ichor — three offerings each night',
        flavor: 'A small drop given freely, in exchange for your patience.',
        reward: '+1',
        icon: '⬤', // ⬤ — solid round droplet stand-in
        canRun: () => {
          if (!gameState.canClaimOffrandeIchor()) {
            const cap = gameState.getDailyIchorAdsCap();
            return {
              ok: false,
              reason: `${cap}/${cap} tributes already given tonight. Returns at dawn.`,
            };
          }
          return { ok: true };
        },
        onReward: () => {
          gameState.recordOffrandeClaim();
          grantIchor(1, 'ad_offering');
          // ichor-earned listener already shows the violet toast.
        },
      },
      {
        id: 'frisson-du-destin',
        title: 'Tremor of Fate',
        subtitle: 'Next Common pull bumps Rare pity by 1',
        flavor: "Slip the dice a finger's weight. The night looks aside.",
        reward: '+1 pity',
        icon: '⚛', // ⚛
        canRun: () => {
          if (gameState.hasFrissonBuff()) {
            return {
              ok: false,
              reason: 'The tremor already runs through you. Spend it on a pull.',
            };
          }
          if (!gameState.canArmFrisson()) {
            return {
              ok: false,
              reason: 'Only once per ascension. The veil tires of the trick.',
            };
          }
          return { ok: true };
        },
        onReward: () => {
          gameState.armFrissonBuff();
          showToast(
            'TREMOR ARMED',
            'Your next Common pull tightens the Rare pity by 1.',
          );
        },
      },
    ];
  }

  private async perform(rite: RiteSpec): Promise<void> {
    const card = this.cards.get(rite.id);
    const sub = this.subtitles.get(rite.id);
    if (!card || !sub) return;

    if (!adsAvailable()) {
      showToast('THE RITE FAILED', 'Rites require a device offering.');
      return;
    }

    const gate = rite.canRun();
    if (!gate.ok) {
      showToast('NOT YET', gate.reason ?? 'The hour is wrong.');
      return;
    }

    card.disabled = true;
    const prevSub = sub.textContent;
    sub.textContent = 'Preparing the rite...';
    const result = await showRewarded(rite.id);
    sub.textContent = prevSub;
    card.disabled = false;

    if (result.rewarded) {
      rite.onReward();
      track('rite_used', { id: rite.id });
      if (navigator.vibrate) navigator.vibrate(20);
      this.render();
    } else if (result.reason === 'failed' || result.reason === 'native-unavailable') {
      showToast('THE RITE FAILED', 'No response from the void. Try again later.');
    }
  }

  private render(): void {
    const available = adsAvailable();
    let anyUsable = false;
    for (const rite of this.getRites()) {
      const card = this.cards.get(rite.id);
      const sub = this.subtitles.get(rite.id);
      if (!card || !sub) continue;
      const gate = rite.canRun();
      const usable = available && gate.ok;
      if (usable) anyUsable = true;
      card.classList.toggle('rite-card--locked', !usable);
      card.classList.toggle(
        'rite-card--armed',
        rite.id === 'invoke-curse' && gameState.getPendingCurseMult() > 1,
      );
      // Only overwrite the subtitle when the card is locked so we don't
      // stomp on the "Preparing the rite..." message mid-flow.
      if (!usable) {
        sub.textContent = gate.reason ?? (available ? rite.subtitle : 'Rites available on device.');
      } else {
        sub.textContent = rite.subtitle;
      }
    }
    this.emptyState.hidden = anyUsable;
  }
}
