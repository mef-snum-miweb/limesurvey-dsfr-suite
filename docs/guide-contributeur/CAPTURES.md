# Captures à réaliser — Guide contributeur DSFR

## Section 0 — À qui s'adresse ce guide

### `0-theme-active-sondage`
- **Montrer** : L'écran des réglages généraux d'un sondage LimeSurvey, avec le sélecteur de thème affichant le thème DSFR comme thème actif du sondage.
- **Annoter** : Entourer le champ/sélecteur de thème indiquant que le thème DSFR est bien sélectionné.

## Section 1 — La philosophie du thème — conformité RGAA / DSFR

### `c1-apercu-formulaire-dsfr`
- **Montrer** : Une page de questionnaire LimeSurvey affichée avec le thème DSFR activé, montrant l'en-tête officiel (bloc Marianne / logo République Française), une question dont le libellé apparaît comme un titre court, et le texte d'aide enrichi affiché juste en dessous. L'ensemble illustre le rendu conforme DSFR sans intervention du contributeur.
- **Annoter** : Entourer l'en-tête Marianne (présentation DSFR automatique), le libellé de la question (repère 'titre court') et la zone d'aide sous le libellé (repère 'contenu riche').

## Section 2 — Gérer les options du thème

### `c2-panneau-options`
- **Montrer** : Vue d'ensemble du panneau des options avancées du thème DSFR dans l'administration LimeSurvey, montrant la rangée d'onglets (Options générales, Images, Header et footer, Accessibilité, Mentions légales, Données personnelles, Gestion des cookies, Protection anti-bot).
- **Annoter** : Entourer la barre d'onglets pour montrer comment naviguer entre les groupes d'options.

### `c2a-options-generales`
- **Montrer** : L'onglet Options générales déployé, avec les champs container, showpopups, showclearall, questionhelptextposition, fixnumauto, showquestioncode, sanitize_rte_content, contributor_hints et show_pdf_export.
- **Annoter** : Surligner sanitize_rte_content et contributor_hints comme options de conformité à laisser activées.

### `c2a-contributor-hints`
- **Montrer** : Une prévisualisation d'enquête où les repères contributeur signalent une mise en forme non conservée (message d'avertissement en aperçu).
- **Annoter** : Entourer le bandeau/repère d'avertissement et préciser qu'il n'est visible qu'en aperçu, jamais par les répondants.

### `c2b-images-logos`
- **Montrer** : L'onglet Images avec les options brandlogo, brandlogo_sircom_certified et brandlogofile (liste déroulante de fichiers).
- **Annoter** : Encadrer les cases brandlogo et brandlogo_sircom_certified pour rappeler la double condition d'autorisation + certification SIRCOM.

### `c2c-header-footer`
- **Montrer** : L'onglet Header et footer avec dsfr_theme (Clair/Sombre/Système), show_marianne, show_footer_links, marianne_text, header_title, baseline_text, footer_text et intellectual_property.
- **Annoter** : Surligner marianne_text et header_title, et pointer marianne_text = « République Française » quand un logo opérateur est présent.

### `c2d-accessibilite`
- **Montrer** : L'onglet Accessibilité avec rgaa_conformity (Totalement/Partiellement/Non), rgaa_declaration_date, accessibility_statement_url et accessibility_content.
- **Annoter** : Entourer rgaa_conformity en rappelant qu'il doit refléter l'audit réel.

### `c2e-antibot`
- **Montrer** : L'onglet Protection anti-bot avec antibot_enabled, antibot_timer et antibot_custom_questions (zone au format Question|Réponse).
- **Annoter** : Surligner antibot_enabled et montrer un exemple de question personnalisée au format Question|Réponse.

## Section 3 — Créer un formulaire

### `apercu-contributeur-bandeau`
- **Montrer** : La page de prévisualisation d'un questionnaire dans LimeSurvey avec le thème DSFR, cadrée sur le haut de page pour montrer le bandeau/repère « Aperçu contributeur » qui indique le mode conception.
- **Annoter** : Entourer le bandeau « Aperçu contributeur » en haut de la prévisualisation ; ajouter une note indiquant que ce repère n'apparaît pas pour le répondant final.

## Section 3bis — Accessibilité éditoriale (RGAA au quotidien)

### `3bis-telechargement-fichier`
- **Montrer** : Le composant DSFR Téléchargement de fichier tel qu'il s'affiche pour l'usager, montrant un intitulé de document explicite suivi de la mention automatique du format et du poids (ex. « Notice d'aide au remplissage — PDF, 1,7 Mo »).
- **Annoter** : Entourer la ligne format+poids et l'intitulé du document pour montrer qu'ils décrivent le fichier, pas l'action.

### `3bis-alt-image`
- **Montrer** : La boîte de dialogue d'insertion d'image de l'éditeur avec le champ de saisie de l'alternative textuelle (texte alternatif) rempli d'un exemple pertinent.
- **Annoter** : Entourer le champ d'alternative textuelle et pointer un exemple correct par rapport à un exemple creux (« image.png »).

### `3bis-menu-styles-titres`
- **Montrer** : Le menu déroulant Styles de l'éditeur de texte ouvert, montrant les niveaux de titre disponibles, distincts de l'option de mise en gras.
- **Annoter** : Entourer les entrées de niveaux de titre et barrer visuellement le bouton Gras pour illustrer « un titre n'est pas du gras ».

### `3bis-badge-statut-texte`
- **Montrer** : Un exemple de Badge DSFR de statut (ex. « Clôturée ») affiché à côté du libellé d'un élément, où le texte du statut est lisible indépendamment de la couleur.
- **Annoter** : Entourer le libellé texte du badge pour souligner qu'il porte le sens, la couleur n'étant qu'un renfort.

## Section 4 — Utiliser l'éditeur de texte

### `4a-bascule-barres`
- **Montrer** : L'éditeur CKEditor de LimeSurvey ouvert sur un champ de texte (libellé de question ou aide), montrant la barre d'outils simple sur une ligne. Idéalement une vue avant/après, ou la barre complète déployée juste en dessous pour comparaison.
- **Annoter** : Entourer le bouton de bascule (agrandir/réduire la barre) à l'extrémité de la barre d'outils. Sur la vue complète, entourer aussi les menus 'Styles' et 'Modèles/Templates' qui apparaissent.

### `4b-mode-source`
- **Montrer** : L'éditeur CKEditor basculé en mode code/source, affichant le HTML brut d'un contenu simple (ex. un texte d'aide avec une liste et un lien).
- **Annoter** : Entourer le bouton qui active le mode source dans la barre d'outils. Éventuellement surligner un fragment de balise pour illustrer qu'on ne touche qu'à un endroit précis.

## Section 5 — Mises en forme et blocs DSFR

### `c5-menu-styles`
- **Montrer** : La barre d'outils de l'éditeur de texte LimeSurvey avec le menu déroulant Styles ouvert, montrant les entrées DSFR : Paragraphe — introduction, Paragraphe — plus grand/plus petit, Texte — plus grand/plus petit, Badge — information/succès/nouveau.
- **Annoter** : Entourer le bouton Styles dans la barre d'outils et encadrer la liste déroulante déployée.

### `c5-palette-templates`
- **Montrer** : La boîte de dialogue Templates (Modèles) ouverte depuis la barre d'outils, listant les blocs DSFR : Accordéon, Mise en avant (avec/sans titre), Mise en exergue, Alerte (information, succès, erreur, avertissement), Citation, Tableau, Téléchargement de fichier.
- **Annoter** : Entourer le bouton Templates/Modèles dans la barre d'outils et encadrer la liste des modèles proposés.

### `c5-telechargement-champs`
- **Montrer** : Le bloc Téléchargement de fichier fraîchement inséré dans l'éditeur, avec le texte d'exemple visible : l'intitulé du fichier, le détail « Format – Poids » et, en vue code ou via l'attribut du lien, l'espace réservé [URL-du-fichier].
- **Annoter** : Entourer les trois zones à remplacer : l'URL ([URL-du-fichier]), l'intitulé du fichier, et la mention « Format – Poids ».

## Section 6 — Prévisualiser et vérifier

### `c6-boutons-apercu`
- **Montrer** : Barre d'outils de l'écran de gestion des questions dans LimeSurvey montrant côte à côte les trois boutons/actions de prévisualisation : aperçu d'une question, aperçu d'un groupe, aperçu du questionnaire complet.
- **Annoter** : Entourer et numéroter (1, 2, 3) les trois boutons d'aperçu : question, groupe, questionnaire complet.

### `c6-accordeon-apercu`
- **Montrer** : Rendu répondant (aperçu ou questionnaire activé) avec le thème DSFR : à gauche un accordéon replié dans une aide de question, à droite le même accordéon déplié après clic laissant apparaître son contenu complémentaire.
- **Annoter** : Montrer l'état replié et l'état déplié côte à côte ; entourer le libellé cliquable de l'accordéon et la flèche qui indique le pliage/dépliage.

## Section 7 — Recettes rapides

### `c7-palette-templates`
- **Montrer** : L'éditeur de texte d'aide d'une question LimeSurvey avec la palette Templates du thème DSFR déroulée, listant les composants disponibles (Accordéon, Mise en avant avec/sans titre, Mise en exergue, les quatre Alertes, Citation, Tableau, Téléchargement de fichier).
- **Annoter** : Entourer le bouton/menu Templates dans la barre d'outils et la liste déroulée des composants.

## Section 8 — Pièges & FAQ

### `8-couleur-vers-composant`
- **Montrer** : Comparaison avant/apres : a gauche une phrase saisie en rouge dans l'editeur qui s'affiche en noir sur le sondage ; a droite la meme information portee par une alerte DSFR et un badge de statut.
- **Annoter** : Entourer en rouge la couleur perdue a gauche ; entourer en vert le composant alerte et le badge a droite.

### `8-tableau-vers-aide`
- **Montrer** : L'ecran d'edition d'une question LimeSurvey montrant le champ Libelle (avec une phrase courte) et, en dessous, le champ Aide contenant le tableau riche.
- **Annoter** : Fleche du tableau initialement dans le Libelle vers le champ Aide ; encadrer le champ Aide.

### `8-apercu-complet-vs-question`
- **Montrer** : La barre d'apercu de LimeSurvey avec les boutons d'apercu d'une seule question, d'apercu du groupe et d'apercu du sondage complet.
- **Annoter** : Barrer le bouton d'apercu d'une seule question ; entourer en vert les boutons apercu du groupe et apercu du sondage complet.

## Section 9 — Aide et remontées

### `9-github-issues`
- **Montrer** : La page de l'onglet Issues du dépôt GitHub mef-snum-miweb/limesurvey-theme-dsfr, montrant la liste des tickets existants et le bouton vert 'New issue' pour en créer un nouveau.
- **Annoter** : Entourer le bouton 'New issue' (créer un ticket) et la barre de recherche/filtre des tickets existants.

## Section annexeA — Annexe A — Mise en place (administrateur)

### `a2-selection-theme`
- **Montrer** : L'écran des réglages de présentation d'un sondage LimeSurvey, avec la liste déroulante de choix du thème et le thème DSFR sélectionné.
- **Annoter** : Entourer le sélecteur de thème et l'option DSFR retenue.

### `a3-plugin-active`
- **Montrer** : La page Configuration > Plugins de LimeSurvey montrant la ligne CKEditorDSFR avec le statut activé, et à proximité les boutons Analyser les fichiers / Installer.
- **Annoter** : Entourer la ligne du plugin CKEditorDSFR, son indicateur d'état activé, et le bouton Analyser les fichiers.

## Section annexeB — Annexe B — Référentiel des composants DSFR

### `annexeB-palette`
- **Montrer** : La palette / liste des composants DSFR proposés par le plugin CKEditorDSFR dans l'éditeur de texte d'une question ou d'une aide LimeSurvey, montrant les entrées Accordéon, Mise en avant (avec/sans titre), Mise en exergue, Alerte (information/succès/erreur/avertissement), Citation, Tableau, Téléchargement de fichier.
- **Annoter** : Entourer l'ensemble des entrées de composants DSFR de la palette pour montrer qu'elles correspondent aux fiches de l'annexe.

### `annexeB-templates`
- **Montrer** : Le menu Templates (ou galerie de modèles) de l'éditeur ouvert, listant les blocs DSFR insérables tels qu'ils apparaissent au contributeur avant insertion dans le champ aide/introduction.
- **Annoter** : Encadrer le bouton ou l'onglet Templates et la liste déroulée des blocs disponibles.

