// Narrative lore entries for the Tome's Bestiary (thralls) and Histories
// (forms). Unlocked progressively — thralls on first purchase, forms when
// reached. Tone: dark academia premium prose, 80-130 words per entry.
// Written in English (i18n FR comes in Phase E1).

import type { ThrallId } from './thralls';
import type { VampireForm } from './forms';

export const THRALL_LORE: Readonly<Record<ThrallId, string>> = {
  rat: `The first ally is small, and it does not sleep. The rats of the old quarters have watched every vampire awaken for nine centuries. They know the taste of dying breath before the dying do. A stray rat cannot be bought — it chooses you, and the choosing is irrevocable. Keep one, and the city's vermin will carry your name through the gutters like a rumor. Keep many, and the rumor becomes a tide. They are not loyal. They are attentive. There is a difference.`,

  ghoul: `Ghouls were mortals once, before hunger rewrote them. They no longer remember their names, which is a mercy. A ghoul answers to the scent of fresh kill the way a child answers to a lullaby — without thought, without resistance. They are crude but tireless. In the court of a young vampire, ghouls serve as foot soldiers and test subjects; in the court of an Elder, they are decoration. Feed them once and they will follow you until their bones unthread. Few ever do.`,

  fledgling: `A Fledgling is not yet a vampire. They have been bitten, their heart stilled, their pulse replaced with a borrowed rhythm that follows yours — but their eyes still hold the grief of the living. Some forget. Most do not. A Fledgling you take must be fed, guided, named. They will try, at first, to please you. Later they will try to kill you. Every Progenitor in recorded bloodlore began as a Fledgling who chose, one night, to stop being afraid.`,

  thrall: `A proper Thrall has completed the small rites: the first kill, the first silence, the first century. They obey not from fear but from habit, which is a deeper thing. Thralls are the spine of any vampire household — they manage the others, they keep the accounts, they remember which mortals have seen too much. A Thrall will never ask why. A Thrall will never refuse. When a Thrall does refuse, it is already too late, and the vampire is no longer in charge.`,

  blade: `A Nightblade is a Thrall who has killed on command, cleanly, more times than can be counted by the fingers of the dead. They wear no armor. They speak rarely. They do not serve out of love, though they may have felt something resembling it once. A Nightblade is given a weapon at her binding — a weapon she will never lay down, not even to feed. She is the sharpest tool in the house. She is also, on certain nights, the most frightening thing in it.`,

  courtesan: `The Courtesans keep the house beautiful. They are Thralls chosen for their faces, their voices, the way they fold silk. A Blood Courtesan does not fight; a Blood Courtesan arranges rooms. She knows which duke drinks too much at supper, which bishop will not be missed. The work of the courtesans is the work of tapestry: nothing visible, but every thread placed. A vampire without courtesans is a vampire without a court, and a court is what distinguishes a Lord from a beast.`,

  elder: `An Elder is a vampire bound to another vampire. There are treaties, there are debts, there are centuries of quiet arrangement. An Elder has been an Elder longer than most cities have stood. When an Elder agrees to serve you, it is because something in your line matters to theirs — an old promise, an unpaid sorrow, a rival they would see humiliated. Elders do not flatter. Elders do not forget. To have an Elder in your house is to have a library that will, eventually, name its price.`,

  cardinal: `The Cardinals are the oldest thing in the bloodline that still answers to a name. They are not immortal; they are merely unkilled. In the earliest centuries they served the first vampires, and then the first Lords, and now, if the hour demands, they serve you. A Cardinal does not walk into a room — the room rearranges itself to accommodate him. His voice is quieter than silence. When he speaks, even the Elders listen. When he refuses, the bloodline remembers, and remembers.`,
};

export const FORM_LORE: Readonly<Record<VampireForm, string>> = {
  NEWBORN: `The first night is always a mistake. You wake where you were buried, or where you fell, or where someone kind enough to be called a monster chose to leave you. Your mouth tastes of iron and soil. The mortals you knew are either dead or very far away, and the language you used to speak feels strange now, like a garment cut for a different body. Newborns are weak in the way all weapons are weak when first unsheathed. The Bloodline is patient. It will teach you.`,

  ELDER: `An Elder is what the mortal world calls old. The vampire world calls it beginning. You have survived three or four lives by now — a decade can be a life, if the decade asked enough of you. Your fangs have fit in your mouth. Your grief has fit in your hunger. The house remembers your name. The first thralls have learned your preferred silences. There are still things that can kill you. You have, at least, begun to recognize them before they arrive.`,

  LORD_OF_NIGHT: `A Lord is an Elder who has stopped apologizing. Whole rooms rearrange themselves at your entrance. A mortal who meets your eyes will not sleep well for a year. The weaker vampires of the region will have learned your name and learned, soon after, to not say it aloud. You hold a court now. The court has politics, which means it has enemies. You have nights where you almost remember being mortal, and nights where remembering mortality is the rarest trick you can still perform.`,

  METHUSELAH: `You have outlived the language you were born in. The cities you knew have been burned, rebuilt, renamed, and burned again. Your grief has compressed into something dense and useful — like a coin you never spend but always carry. You can recognize another Methuselah by the way they stand in doorways. You no longer need to feed often; you need to feed well. The difference between you and a god, at this hour, is that a god would not find the distinction interesting.`,

  PROGENITOR: `A Progenitor is the origin of a line. The Fledglings who fed on you became Elders; the Elders became Lords; the Lords became the lineage whose name is whispered in three capital cities and feared in five. You are older than every surviving written language. When you sleep, the weather of an entire province changes. Your bloodline is now a political fact. The mortals who study your existence call it cryptozoology. They are not entirely wrong.`,

  TERA_OVERLORD: `The number of vampires who have crossed into Tera is small enough to remember by name. Those who have met you describe it afterwards as an encounter, not a conversation; the form of address is always incorrect, no matter what form is tried. Your presence is not a fact — it is an event. When you move through a city, the tides of the nearest ocean shift, slightly, out of decorum. You do not have followers anymore. You have a climate.`,

  HORROR_INCARNATE: `Mortals have a dozen names for you. The vampires who speak of you tend to use none, and change the subject. The shape you wear at this hour is a negotiation — the bloodline cannot contain you without one, and neither can geography. You still eat, but what you eat is not blood in the sense mortals mean the word. You eat the distance between a mortal's wish and its refusal. You eat the silence after a prayer. You are not cruel. You have simply gone past the place where cruelty can reach.`,

  THIRST: `At last there is no portrait. There is no vampire wearing the shape. There is only the verb that the bloodline was trying to spell since the first Fledgling: to want. You are not a being anymore. You are a grammatical function the universe has consented to host. The mortals continue their small economies. The vampires continue their small courts. Somewhere above or below all of this, you move the way tide moves, with no voice, and every mortal alive has, at some point, felt you at the edge of their dreaming.`,
};
