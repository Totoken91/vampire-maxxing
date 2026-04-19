# Assets Prompts — ChatGPT Generation Guide

## Comment utiliser ces prompts

Ces prompts sont conçus pour être collés dans **ChatGPT (avec DALL-E 3 ou équivalent)**. Ils suivent un pattern précis pour garantir :

1. **Cohérence visuelle** entre les 16 assets (style, palette, cadrage)
2. **Qualité premium** (évite le look AI slop générique)
3. **Compatibilité** avec l'UI codée (cadrage qui s'intègre dans les frames SVG)

## Workflow recommandé

### Session 1 : Générer les 8 portraits

1. Ouvre ChatGPT
2. Commence par le **prompt de base** (dans `portraits.md`) pour établir le style
3. Génère NEWBORN en premier
4. Quand tu es satisfait, dis à ChatGPT : *"Keep this exact style for all subsequent images. Same color palette, same painting technique, same 3/4 angle, same size, same lighting approach. Only the character changes."*
5. Génère ELDER en référençant le style de NEWBORN
6. Continue pour les 6 autres formes, chacune en référençant la précédente
7. **Si un résultat dévie**, dis : *"Make it more consistent with the previous image in terms of [style / lighting / palette]"*

### Session 2 : Générer les 8 thralls

1. Nouveau chat (pour éviter la pollution contextuelle)
2. Utilise le prompt de base dans `thralls.md`
3. Génère chaque thrall en référençant le style engraving
4. Cadrage : buste ou symbole au centre, fond transparent ou très sombre

### Session 3 (post-MVP) : Skins

Ouvrir `skins.md` et refaire les 8 portraits × 3 palettes = 24 images.
Ne pas faire au MVP. On livre d'abord la version de base.

## Règles d'or pour chaque prompt

- **Toujours finir par** : "Render this as a premium illustration for a mobile game. Ultra detailed, award-worthy, not AI-generic."
- **Toujours inclure** les dimensions et le cadrage attendu
- **Toujours bannir** explicitement : "NO cartoon, NO anime, NO cute, NO chibi, NO blurry backgrounds, NO AI-generic faces"

## Checklist après génération

Pour chaque image, vérifier :
- [ ] Cadrage correct (buste 3/4 pour portraits, symbole centré pour thralls)
- [ ] Palette respectée (noir profond, rouge sang, or antique, blanc os)
- [ ] Pas de texte parasite généré dans l'image
- [ ] Pas de watermark ou signature AI
- [ ] Niveau de détail cohérent entre images
- [ ] L'image a une "âme" (pas juste un visage générique)

Si un critère échoue : **regénère**. Ne prends pas un compromis esthétique — c'est le cœur émotionnel du jeu.

## Post-génération : optimisation

Une fois les images validées :
1. Redimensionne en 512×512 (portraits) / 256×256 (thralls) si ChatGPT a généré plus grand
2. Run `npm run optimize:assets` dans le repo → compression automatique via sharp
3. Commit dans `assets/portraits/` et `assets/thralls/`

## Si tu préfères utiliser autre chose

Les prompts sont écrits pour ChatGPT/DALL-E mais fonctionnent aussi avec :
- **Midjourney** : ajouter `--ar 1:1 --v 6` à la fin
- **Stable Diffusion** : utiliser un model type "SDXL Realistic Vision" + les prompts en positive prompt + BANNIR les éléments en negative prompt
- **nano Banana / autre** : adapter selon le format

L'important c'est la cohérence visuelle entre les 16 assets, pas l'outil utilisé.
