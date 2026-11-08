# Tests automatiques bêta

Le workflow `.github/workflows/beta-tests.yml` proposé dans la PR #2 cible
uniquement les pushes sur `beta/stabilisation-securite` et les PR vers cette
branche. Sa validation sur la branche de PR lance les tests et la simulation.
La PR n'est pas fusionnée : main, la branche bêta et Pages restent inchangés.
Aucun calendrier sur main ni étape de déploiement n'est ajouté.

La chaîne obligatoire est : installation du lockfile sans scripts de cycle de
vie, génération Prisma sans connexion à une base, génération des types Next
sans build de production, `npm test`, TypeScript, puis l'entrée exclusivement
simulée `node scripts/github-agent/simulate.mjs`. Une erreur arrête la chaîne.

Le contrôle GitHub conserve le nom `Unit tests and TypeScript`, déjà exigé par
la protection bêta. Le jeton reste en lecture seule, sans secret, environnement
de déploiement ni identifiants Git persistants. Les actions sont épinglées.
La politique IA réelle reste désactivée et aucun appel payant n'est autorisé.

Le runner de tests découvre les fichiers `.test.ts`, `.test.mjs` et `.test.cjs`.
Les sauvegardes et tests `.integration.test.ts` nécessitant une base dédiée
sont exclus. Aucun fichier de sauvegarde n'est modifié ou supprimé.

Validation locale :

```sh
npm test
npm run typecheck
node scripts/github-agent/simulate.mjs
```

Les dépendances du simulateur sont incluses dans la même PR :
`scripts/github-agent/{simulate,simulation,controller,policy,budget,clients}.mjs`,
`.github/beta-agent-policy.json`, `.github/protections/*.json` et les tests
associés. Publier le workflow seul produirait une chaîne incomplète. Ne pas
inclure l'entrée réelle `run.mjs`, les secrets, fichiers d'environnement,
sauvegardes ou changements de déploiement dans une future publication.

La mise à jour reste sur la branche de la PR #2 et ne touche ni main ni les
paramètres Pages. Une intégration ultérieure dans la bêta nécessite une
autorisation de fusion distincte ; aucune protection ne doit être contournée.
