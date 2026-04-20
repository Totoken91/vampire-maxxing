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
  /** The word within `title` that gets the red italic emphasis in the header. */
  readonly emphasis: string;
  readonly subtitle: string;
  readonly portraitPath: string;
  readonly threshold: number;
}

export const FORMS: readonly FormDefinition[] = [
  { id: 'NEWBORN',          title: 'a Newborn',           emphasis: 'Newborn',       subtitle: 'Newborn',            portraitPath: '/assets/portraits/newborn.webp',          threshold: 0 },
  { id: 'ELDER',            title: 'an Elder',            emphasis: 'Elder',         subtitle: 'Elder',              portraitPath: '/assets/portraits/elder.webp',            threshold: 1 },
  { id: 'LORD_OF_NIGHT',    title: 'a Lord of Night',     emphasis: 'Lord',          subtitle: 'Lord of Night',      portraitPath: '/assets/portraits/lord-of-night.webp',    threshold: 3 },
  { id: 'METHUSELAH',       title: 'a Methuselah',        emphasis: 'Methuselah',    subtitle: 'Methuselah',         portraitPath: '/assets/portraits/methuselah.webp',       threshold: 7 },
  { id: 'PROGENITOR',       title: 'a Progenitor',        emphasis: 'Progenitor',    subtitle: 'Progenitor',         portraitPath: '/assets/portraits/progenitor.webp',       threshold: 15 },
  { id: 'TERA_OVERLORD',    title: 'a Tera Overlord',     emphasis: 'Tera Overlord', subtitle: 'Tera Overlord',      portraitPath: '/assets/portraits/tera-overlord.webp',    threshold: 30 },
  { id: 'HORROR_INCARNATE', title: 'a Horror Incarnate',  emphasis: 'Horror',        subtitle: 'Horror Incarnate',   portraitPath: '/assets/portraits/horror-incarnate.webp', threshold: 50 },
  { id: 'THIRST',           title: 'the Thirst',          emphasis: 'Thirst',        subtitle: 'The Thirst',         portraitPath: '/assets/portraits/thirst.webp',           threshold: 100 },
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
