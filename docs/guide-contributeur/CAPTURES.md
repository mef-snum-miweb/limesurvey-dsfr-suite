# Captures à réaliser — Guide contributeur DSFR

Spec autonome pour produire les captures d'écran du guide. Chaque image est
nommée **exactement** comme le guide l'attend : enregistrer dans
`docs/guide-contributeur/img/<nom>.png`.

## Prérequis / environnement

- Instance LimeSurvey avec le **thème DSFR activé** et le **plugin CKEditorDSFR activé**
  (Configuration › Plugins › Analyser les fichiers › Installer › Activer).
  - En local : `docker compose -f docker-compose.dev.yml up -d` → `http://localhost:8081`
    (admin/admin), puis `./db/seed.sh` charge le questionnaire de test.
- **Questionnaire de test** : « Baromètre numérique de l'agent » (sid **527199**, inactif).
- **Question vitrine** : pour les rendus de composants, coller le HTML ci-dessous dans le
  champ **Aide** d'une question (ex. qid 238, groupe 16), en mode source `</>` :

```html
<p class="fr-text--lead">Texte d'introduction (style DSFR).</p>
<div class="fr-callout"><h3 class="fr-callout__title">Mise en avant</h3><p class="fr-callout__text">Information importante à signaler.</p></div>
<p>Statut : <span class="fr-badge fr-badge--info">Nouveau</span> <span class="fr-badge fr-badge--success">Clôturée</span></p>
<div class="fr-alert fr-alert--info"><h3 class="fr-alert__title">Information</h3><p>La collecte se termine le 30 juin.</p></div>
<section class="fr-accordion"><h3 class="fr-accordion__title"><button type="button" class="fr-accordion__btn" aria-expanded="false" aria-controls="acc-demo">En savoir plus</button></h3><div class="fr-collapse" id="acc-demo"><p>Information complémentaire repliable.</p></div></section>
<figure class="fr-quote"><blockquote><p>« Une citation. »</p></blockquote><figcaption><p class="fr-quote__author">Auteur</p></figcaption></figure>
<div class="fr-table"><table><caption>Tableau</caption><thead><tr><th scope="col">Colonne 1</th><th scope="col">Colonne 2</th></tr></thead><tbody><tr><td>A</td><td>B</td></tr></tbody></table></div>
<div class="fr-download"><p><a href="#" download class="fr-download__link">Notice d'aide au remplissage<span class="fr-download__detail">PDF – 1,7 Mo</span></a></p></div>
```

> Les composants **interactifs** (accordéon) ne se déplient qu'en **aperçu** (ou sur le
> questionnaire activé), pas dans l'éditeur.

## Plan par écran (URLs pour l'instance locale)

### Écran 1 — Rendu front (question vitrine)
`…/index.php/survey/index/action/previewquestion/sid/527199/gid/16/qid/238`
- `c1-apercu-formulaire-dsfr` — vue haut : en-tête Marianne + libellé + aide. **Annoter** : en-tête (présentation DSFR auto), libellé (« titre court »), aide (« contenu riche »).
- `apercu-contributeur-bandeau` **et** `c2a-contributor-hints` — le bandeau « Aperçu contributeur ». **Annoter** : entourer le bandeau ; noter « invisible pour le répondant ».
- `3bis-badge-statut-texte` — la ligne « Statut : Nouveau Clôturée ». **Annoter** : le texte porte le sens, la couleur n'est qu'un renfort.
- `8-couleur-vers-composant` — le bandeau illustre la mise en forme retirée.
- `c6-accordeon-apercu` — cliquer « En savoir plus » pour déplier ; idéalement montrer replié + déplié.
- `3bis-telechargement-fichier` — descendre jusqu'au bloc « Notice d'aide au remplissage — PDF ». **Annoter** : intitulé + format/poids décrivent le document.

### Écran 2 — Options du thème
`…/index.php/themeOptions/updateSurvey/surveyid/527199` → cliquer **« Personnaliser le thème »**, puis chaque onglet :
- `c2-panneau-options` — la barre des 8 onglets. **Annoter** : la barre d'onglets.
- `c2a-options-generales` — onglet Options générales. **Annoter** : surligner `Nettoyer les styles inline` et `Repères contributeur en prévisualisation`.
- `c2b-images-logos` — onglet Images. **Annoter** : avertissement DSFR logo + certification SIRCOM.
- `c2c-header-footer` — onglet Header et footer.
- `c2d-accessibilite` — onglet Accessibilité. **Annoter** : la mention de conformité RGAA (« doit refléter l'audit »).
- `c2e-antibot` — onglet Protection anti-bot.

### Écran 3 — Plugins
`…/index.php/admin/pluginmanager/sa/index`
- `a3-plugin-active` — ligne **CKEditorDSFR**, statut ● (actif). **Annoter** : la ligne + le bouton « Analyser les fichiers ».

### Écran 4 — Éditeur (question 238 → **Éditer** → onglet **Aide**)
`…/index.php/questionAdministration/view/surveyid/527199/gid/16/qid/238`
- `4a-bascule-barres` — barre d'outils simple + complète. **Annoter** : le bouton de bascule ; les menus Styles et Modèles.
- `8-tableau-vers-aide` — vue avec les onglets Question / Aide (montrer que le riche va dans l'Aide).
- `c5-menu-styles` **et** `3bis-menu-styles-titres` — clic sur **Styles** (menu ouvert : Paragraphe introduction / plus grand / petit, Texte, Badges).
- `c5-palette-templates` + `c7-palette-templates` + `annexeB-palette` + `annexeB-templates` — clic sur l'**icône document** (à droite de Styles) → dialogue « Contenu des modèles » listant les 11 composants.
- `4b-mode-source` — clic sur **`</>`** (montre le HTML).
- `3bis-alt-image` — clic sur l'**icône image** → champ « texte alternatif ».
- `c5-telechargement-champs` — insérer le modèle **Téléchargement** → montrer les zones URL / intitulé / « Format – Poids ».

### Écran 5 — Boutons d'aperçu
Même page que l'écran 4, **avant** de cliquer « Éditer » (barre du haut) :
- `c6-boutons-apercu` **et** `8-apercu-complet-vs-question` — les 3 boutons « Prévisualiser le questionnaire / le groupe / la question ». **Annoter** : numéroter 1-2-3.

### Écran 6 — Sélecteur de thème
Sondage → **Paramètres › Présentation** (choix du thème) :
- `0-theme-active-sondage` **et** `a2-selection-theme` — le thème DSFR sélectionné. **Annoter** : le sélecteur.

### Écran 7 — GitHub (remontées publiques)
`https://github.com/mef-snum-miweb/limesurvey-theme-dsfr/issues`
- `9-github-issues` — liste des tickets + bouton « New issue ». **Annoter** : le bouton « New issue ».

## Récapitulatif des 28 fichiers attendus

c1-apercu-formulaire-dsfr · apercu-contributeur-bandeau · c2a-contributor-hints ·
3bis-badge-statut-texte · 8-couleur-vers-composant · c6-accordeon-apercu ·
3bis-telechargement-fichier · c2-panneau-options · c2a-options-generales ·
c2b-images-logos · c2c-header-footer · c2d-accessibilite · c2e-antibot ·
a3-plugin-active · 4a-bascule-barres · 8-tableau-vers-aide · c5-menu-styles ·
3bis-menu-styles-titres · c5-palette-templates · c7-palette-templates ·
annexeB-palette · annexeB-templates · 4b-mode-source · 3bis-alt-image ·
c5-telechargement-champs · c6-boutons-apercu · 8-apercu-complet-vs-question ·
0-theme-active-sondage · a2-selection-theme · 9-github-issues
