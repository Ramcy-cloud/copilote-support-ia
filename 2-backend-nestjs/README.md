# Orchestrateur NestJS — Copilote Support IT

Service intermédiaire entre l'interface React et le moteur IA Python. Présentation générale du projet, architecture et lancement des trois services : voir le [README racine](../README.md).

## Rôle

- Expose `POST /copilot/ask` (corps JSON `{ "sujet": "...", "description": "..." }`).
- Transmet la demande au service IA Python (`AI_SERVICE_URL`) et renvoie sa réponse telle quelle.
- Enregistre le ticket et la résolution proposée dans la table `tickets_historique` de `database.sqlite` (SQLite, via TypeORM).
- Restreint CORS aux origines de `ALLOWED_ORIGINS`.

En cas d'échec du service IA, la route répond `500` « Erreur lors de la communication avec le service IA » et rien n'est enregistré.

## Variables d'environnement

NestJS ne charge pas de fichier `.env` : exportez ces variables dans le shell (modèle commenté : [`.env.example`](./.env.example)).

| Variable | Défaut | Rôle |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Origines autorisées par CORS, séparées par des virgules (le joker `*` est ignoré). |
| `AI_SERVICE_URL` | `http://localhost:8000/ask-copilot` | URL complète de la route du service IA Python. |
| `PORT` | `3000` | Port d'écoute. |
| `DB_SYNCHRONIZE` | `false` | `true` = création/mise à jour automatique du schéma SQLite au démarrage. **Développement uniquement** : peut supprimer des colonnes, donc des données. |

## Installation

```bash
npm install
```

`database.sqlite` n'est pas versionné. Au premier lancement, créez la table en activant une fois la synchronisation :

```bash
DB_SYNCHRONIZE=true npm run start:dev
```

## Lancement

```bash
npm run start:dev    # développement (rechargement automatique)
npm run build && npm run start:prod
```

Le service IA Python doit tourner sur `AI_SERVICE_URL` pour que `/copilot/ask` réponde.

## Tests et qualité

```bash
npm run lint       # ESLint + Prettier (corrige automatiquement ; la CI lance eslint sans --fix)
npm test           # tests unitaires (service et contrôleur, dépendances simulées)
npm run test:e2e   # tests e2e (application complète, CORS)
npm run build
```

Les tests n'ont besoin ni du service Python ni d'une base existante. La CI exécute ces quatre étapes à chaque pull request ; le lint y est bloquant.
