# LimeSurvey DSFR Suite

Suite d'intégration DSFR (Système de Design de l'État) pour [LimeSurvey](https://www.limesurvey.org/), composée de 3 modules :

| Module | Repo | Description |
|--------|------|-------------|
| Thème DSFR | [limesurvey-theme-dsfr](https://github.com/bmatge/limesurvey-theme-dsfr) | Thème de sondage conforme au DSFR |
| Email DSFR | [limesurvey-email-dsfr](https://github.com/bmatge/limesurvey-email-dsfr) | Plugin de templates d'email conformes DSFR |
| Conversation Albert | [limesurvey-conversation-albert](https://github.com/bmatge/limesurvey-conversation-albert) | Plugin d'assistant conversationnel IA |

Ce repo fournit l'environnement Docker pour le **développement local** et le **déploiement en production**, sans fork de LimeSurvey. Il utilise l'image officielle [`martialblog/limesurvey`](https://github.com/martialblog/docker-limesurvey).

---

## Développement local

### Prérequis

- Docker et Docker Compose
- Git

### Installation

Un seul clone, avec les submodules :

```bash
git clone --recurse-submodules https://github.com/bmatge/limesurvey-dsfr-suite.git
cd limesurvey-dsfr-suite
```

Si vous avez déjà cloné sans `--recurse-submodules` :

```bash
git submodule update --init --recursive
```

Les 3 modules (thème + 2 plugins) vivent sous [`modules/`](modules/) en tant que submodules git, pointant sur les repos GitHub correspondants.

### Démarrage

```bash
docker compose -f docker-compose.dev.yml up -d
```

LimeSurvey est accessible sur **http://localhost:8081** (identifiants : `admin` / `admin`).

### Workflow de développement

Les 3 submodules sont montés en direct dans le conteneur. Toute modification est visible immédiatement après un rafraîchissement du navigateur (pas de rebuild Docker).

**Règle d'or** : on édite **toujours** depuis `modules/<nom>/`, jamais ailleurs. Chaque submodule est un clone git fonctionnel configuré sur sa branche `main`, avec son propre remote GitHub.

```bash
# 1. Éditer et commiter dans le submodule
cd modules/theme-dsfr
# ...modifs...
git add -A
git commit -m "feat: ..."
git push                    # → github.com/bmatge/limesurvey-theme-dsfr (main)

# 2. Remonter le pointeur de submodule dans le repo parent
cd ../..
git add modules/theme-dsfr
git commit -m "chore: bump theme-dsfr"
git push                    # → github.com/bmatge/limesurvey-dsfr-suite (master)
```

Pour tirer les dernières versions des 3 submodules depuis leurs `main` respectifs :

```bash
git submodule update --remote --merge
```

### Arrêt

```bash
docker compose -f docker-compose.dev.yml down        # arrêter (conserve les données)
docker compose -f docker-compose.dev.yml down -v      # arrêter + supprimer les données
```

---

## Déploiement en production

### Installation

```bash
git clone --recurse-submodules https://github.com/bmatge/limesurvey-dsfr-suite.git
cd limesurvey-dsfr-suite
cp .env.example .env
# Éditer .env avec vos valeurs de production
```

### Déploiement

```bash
./deploy.sh
```

Le script met à jour le repo, les submodules, pull les images Docker et relance les services.

### Configuration

- Adapter les labels Traefik dans `docker-compose.yml` à votre domaine
- Configurer le `.env` avec les mots de passe et l'URL publique
- Le réseau `ecosystem-network` doit exister (créé par votre stack Traefik)

---

## Architecture

```
                        ┌─────────────────────────┐
                        │   Image Docker           │
                        │   martialblog/limesurvey │
                        │   (pas de fork)          │
                        └──────────┬──────────────┘
                                   │
               ┌───────────────────┼───────────────────┐
               │                   │                    │
    ┌──────────▼──────┐  ┌────────▼────────┐  ┌───────▼────────────┐
    │  theme-dsfr     │  │  email-dsfr     │  │  conversation-     │
    │  → /themes/     │  │  → /plugins/    │  │  albert            │
    │    survey/dsfr  │  │    DSFRMail     │  │  → /plugins/       │
    │                 │  │                 │  │    ConversationIA   │
    └─────────────────┘  └─────────────────┘  └────────────────────┘
         volume               volume                volume
```

- **Dev local et production** : les volumes pointent tous vers les submodules (`./modules/theme-dsfr/`, `./modules/email-dsfr/`, `./modules/conversation-albert/`). Le repo `limesurvey-dsfr-suite` est la source unique de vérité pour l'arborescence de travail.

---

## Licence

Chaque module a sa propre licence. Voir les repos respectifs.
