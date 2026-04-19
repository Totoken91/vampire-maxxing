// Map prestige count → current vampire form. Drives portrait + title.
// Thresholds live in BALANCE.FORM_THRESHOLDS.

import { BALANCE } from './config/balance';
import { FORMS_BY_ID, type FormDefinition, type VampireForm } from './config/forms';

export function getCurrentForm(prestigeCount: number): VampireForm {
  const t = BALANCE.FORM_THRESHOLDS;
  if (prestigeCount >= t.THIRST) return 'THIRST';
  if (prestigeCount >= t.HORROR_INCARNATE) return 'HORROR_INCARNATE';
  if (prestigeCount >= t.TERA_OVERLORD) return 'TERA_OVERLORD';
  if (prestigeCount >= t.PROGENITOR) return 'PROGENITOR';
  if (prestigeCount >= t.METHUSELAH) return 'METHUSELAH';
  if (prestigeCount >= t.LORD_OF_NIGHT) return 'LORD_OF_NIGHT';
  if (prestigeCount >= t.ELDER) return 'ELDER';
  return 'NEWBORN';
}

export function getCurrentFormDefinition(prestigeCount: number): FormDefinition {
  return FORMS_BY_ID[getCurrentForm(prestigeCount)];
}

/**
 * How many Ascends (within the current form window) the player has done.
 * E.g. at prestigeCount = 4 we're in LORD_OF_NIGHT (threshold 3) on our 2nd
 * run of that form, so this returns 2. Used for "Century N" display.
 */
export function getCenturyInForm(prestigeCount: number): number {
  const t = BALANCE.FORM_THRESHOLDS;
  const thresholds = [
    t.THIRST,
    t.HORROR_INCARNATE,
    t.TERA_OVERLORD,
    t.PROGENITOR,
    t.METHUSELAH,
    t.LORD_OF_NIGHT,
    t.ELDER,
    0,
  ];
  for (const th of thresholds) {
    if (prestigeCount >= th) {
      return prestigeCount - th + 1;
    }
  }
  return 1;
}
