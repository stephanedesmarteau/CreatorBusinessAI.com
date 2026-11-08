# Simulation de l'agent sur la bêta

Cette PR fournit le workflow, son entrée dédiée, les modules nécessaires, la
politique désactivée, les fixtures de protection et les tests. Aucun fichier
local supplémentaire ni secret n'est nécessaire pour simuler le contrôleur.

## Exécution et déclencheurs

```sh
node scripts/github-agent/simulate.mjs
```

Le scénario utilise une issue, des tarifs, une approbation, un registre et des
clients fictifs. Il traverse le contrôleur jusqu'à une proposition simulée sur
`beta/stabilisation-securite`. Toutes les mutations restent en mémoire. La
réservation affichée n'est pas une dépense. Aucun état distant n'est audité.

Le rapport doit indiquer `simulation-passed`, `aiCalls: 0`, `networkCalls: 0`,
`remoteWrites: 0`, `paidMicrocad: 0`, `merges: 0` et `deployments: 0`.
Les valeurs `mockedAiCalls` et `inMemoryWrites` sont uniquement synthétiques.

Le workflow `Beta AI agent simulation` s'exécute sur les PR ciblant la bêta
et les pushes sur la bêta. Sur une PR, il checkout le SHA exact proposé ;
sur un push, le SHA du push. Les tests unitaires et TypeScript doivent réussir
avant le simulateur. Aucune étape ne continue après un échec.

Le calendrier toutes les six heures et le déclencheur après `Beta tests`
restent préparés mais nécessitent la présence du workflow sur la branche par
défaut. Ils ne sont pas activés par cette PR ciblant la bêta. Après installation
future sur la branche par défaut, le calendrier et le lancement manuel visent
la bêta ; `workflow_run` accepte uniquement un succès de la bêta et checkout
le SHA testé. Aucun changement de `main` n'est réalisé par cette PR.
[Fonctionnement des déclencheurs GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

## Garanties et limites

Le job dispose de `contents: read`, sans identifiants Git persistants,
environnement privilégié, cache partagé, artefact externe ou secret. Il ne
crée aucune PR, branche, fusion ou déploiement. L'entrée `simulate.mjs` ignore
les demandes de mode réel, même avec `BETA_AGENT_ENABLED=true`. L'entrée réelle
`run.mjs` n'est pas incluse dans cette PR. Les modules du contrôleur et leurs
clients sont testés avec des substituts en mémoire, jamais des clés réelles.

La politique réelle reste `enabled: false`, avec un plafond de 5 CAD/mois et
sans modèle, tarifs, taux de change, frais ou approbation de facturation.
Les fichiers `.github/protections/*.json` sont des données de validation ;
aucune API d'administration GitHub n'est appelée par le simulateur.
Les minutes GitHub Actions sont distinctes du budget d'API IA.

Les tests ciblés interdisent `fetch`, vérifient les budgets, la conservation de
la politique, les frontières mensuelles et les conditions de fusion simulées.
Ils ne constituent pas une autorisation de génération payante ni de fusion.

```sh
node --test --test-isolation=none tests/github-agent/*.test.mjs
npm test
npm run typecheck
```

Aucune sauvegarde, route, dépendance, configuration de déploiement ou règle
distante n'est modifiée. La PR n'est pas fusionnée automatiquement.
