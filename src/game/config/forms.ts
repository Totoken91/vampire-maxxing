// The 8 vampire forms. Thresholds come from BALANCE.FORM_THRESHOLDS.
// Portrait paths assume the asset pipeline described in docs/07-ASSETS-GUIDE.md.

export type VampireForm =
  | 'NEWBORN'
  | 'ELDER'
  | 'LORD_OF_NIGHT'
  | 'METHUSELAH'
  | 'PROGENITOR'
  | 'TERA_OVERLORD'
  | 'HORROR_INCARNATE'
  | 'THIRST';

export interface FormDefinition {
  readonly id: VampireForm;
  readonly title: string;
  readonly subtitle: string;
  readonly portraitPath: string;
  readonly threshold: number;
}

export const FORMS: readonly FormDefinition[] = [
  { id: 'NEWBORN',          title: 'a Newborn',             subtitle: 'Newborn',            portraitPath: '/assets/portraits/newborn.png',          threshold: 0 },
  { id: 'ELDER',            title: 'an Elder',              subtitle: 'Elder',              portraitPath: '/assets/portraits/elder.png',            threshold: 1 },
  { id: 'LORD_OF_NIGHT',    title: 'a Lord of Night',       subtitle: 'Lord of Night',      portraitPath: '/assets/portraits/lord-of-night.png',    threshold: 3 },
  { id: 'METHUSELAH',       title: 'a Methuselah',          subtitle: 'Methuselah',         portraitPath: '/assets/portraits/methuselah.png',       threshold: 7 },
  { id: 'PROGENITOR',       title: 'a Progenitor',          subtitle: 'Progenitor',         portraitPath: '/assets/portraits/progenitor.png',       threshold: 15 },
  { id: 'TERA_OVERLORD',    title: 'a Tera Overlord',       subtitle: 'Tera Overlord',      portraitPath: '/assets/portraits/tera-overlord.png',    threshold: 30 },
  { id: 'HORROR_INCARNATE', title: 'a Horror Incarnate',    subtitle: 'Horror Incarnate',   portraitPath: '/assets/portraits/horror-incarnate.png', threshold: 50 },
  { id: 'THIRST',           title: 'the Thirst',            subtitle: 'The Thirst',         portraitPath: '/assets/portraits/thirst.png',           threshold: 100 },
] as const;

export const FORMS_BY_ID: Readonly<Record<VampireForm, FormDefinition>> = Object.freeze(
  FORMS.reduce(
    (acc, f) => {
      acc[f.id] = f;
      return acc;
    },
    {} as Record<VampireForm, FormDefinition>,
  ),
);
