# Overlay CKEditor DSFR

Palette de **composants DSFR** et menu **Styles DSFR** ajoutés à l'éditeur de
texte riche (CKEditor 4) de l'administration LimeSurvey. Objectif : permettre aux
gestionnaires d'enquêtes d'insérer des composants conformes **sans passer par le
mode code**, et d'appliquer des **classes DSFR** (qui survivent au sanitizer du
thème) plutôt que des styles inline. Cf. [[ADR-071]].

> **Portée** : override d'assets *core* → customise **notre** instance (lab).
> Pas portable vers une instance partenaire (AFA, écologie) : ce serait le rôle
> d'un plugin LimeSurvey packagé, étape ultérieure si la portabilité est requise.

## Fichiers

| Fichier | Rôle |
|---|---|
| `config.js` | **= config.js de l'image `martialblog/limesurvey` + bloc DSFR additif** en fin. Décore `CKEDITOR.editorConfig` (exécute la config LS d'origine puis ajoute Templates + stylesSet + contentsCss + boutons toolbar). Aucune logique LS réécrite. |
| `dsfr-templates.js` | Palette « Templates » : blocs DSFR prêts à insérer (alerte, mise en avant, encadré, texte d'intro). Pour le champ **Aide** / textes d'intro (pas l'intitulé, aplati en `<h3>`). |
| `dsfr-styles.js` | Menu « Styles » : applique des **classes** DSFR (`fr-text--lead`, badges…). |
| `dsfr-contents.css` | CSS DSFR minimal dans l'iframe de l'éditeur (aperçu WYSIWYG). |

Montés par `docker-compose*.yml` dans `assets/packages/ckeditor/` (même package →
publiés ensemble, `CKEDITOR.basePath` les résout).

## ⚠️ Re-synchroniser `config.js` sur un bump d'image LimeSurvey

`config.js` embarque une **copie fidèle** du `config.js` de l'image pinnée
(`6.16.16-260408`). Si le tag de l'image change (cf. `docker-compose.yml`) :

```bash
IMG=martialblog/limesurvey:<nouveau-tag>
docker run --rm --entrypoint sh "$IMG" -c 'cat /var/www/html/assets/packages/ckeditor/config.js' > /tmp/orig.js
# Reporter le bloc « OVERLAY DSFR » (après la dernière ligne du fichier d'origine)
```

## Workflow de développement local

Les assets CKEditor sont **publiés** par LimeSurvey dans `tmp/assets/<hash>`. Après
toute modification d'un fichier de l'overlay, **purger** ce cache :

```bash
docker exec limesurvey-dev sh -c 'rm -rf /var/www/html/tmp/assets/*'
```

**Piège** : le bind-mount d'un **fichier unique** casse quand l'éditeur réécrit le
fichier (save atomique par rename → le conteneur garde l'ancien inode). Après avoir
édité `config.js`, **recréer le conteneur** avant de purger :

```bash
docker compose -f docker-compose.dev.yml up -d --force-recreate limesurvey
docker exec limesurvey-dev sh -c 'rm -rf /var/www/html/tmp/assets/*'
```

En production, `deploy.sh` purge déjà `tmp/assets` + `tmp/runtime`, et le conteneur
est recréé au déploiement — pas de manip.
