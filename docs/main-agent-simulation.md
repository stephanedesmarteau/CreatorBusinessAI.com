# Préparation de la simulation automatique sur main

Cette PR est indépendante de la PR bêta #2. Elle ajoute uniquement le workflow,
les modules et données nécessaires au simulateur, ses tests et cette notice.
Elle ne fusionne pas la bêta, ne change aucune route, dépendance ou sauvegarde,
et ne modifie pas les protections distantes.

## Après une éventuelle fusion humaine

Le workflow `Main AI agent simulation` sera disponible sur la branche par défaut
main. Il fonctionnera sur les PR vers main, les pushes sur main, à la demande,
et toutes les six heures à 00:23, 06:23, 12:23 et 18:23 UTC. Il pourra aussi
simuler après un succès de `Beta tests` sur la branche bêta uniquement.
Le calendrier GitHub peut être retardé ; aucune heure exacte n'est garantie.
[Déclencheurs GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

Sur une PR, le checkout utilise son SHA exact ; les autres événements utilisent
le SHA GitHub de main. Le workflow ne dépend pas de fichiers non fusionnés sur
la bêta. Le job `Unit tests and TypeScript` exécute les tests ciblés de l'agent,
génère les types Prisma/Next sans connexion à une base ni build de production,
puis valide TypeScript avant de lancer la simulation. Aucun échec n'est ignoré.
Les tests ne prétendent pas valider les routes stabilisées de la bêta absentes
de main : cette PR n'importe pas leur code.

## Simulation exclusivement

```sh
node scripts/github-agent/simulate.mjs
node --test --test-isolation=none tests/github-agent/*.test.mjs
```

Aucun secret, environnement privilégié, cache partagé ou identifiant Git
persistant n'est transmis au job ; `contents` reste en lecture seule.
`BETA_AGENT_ENABLED=false` et l'entrée dédiée `simulate.mjs` ne permettent pas
de sélectionner un mode réel. L'entrée payante `run.mjs` n'est pas publiée.

Le scénario emploie des clients, une issue et une approbation fictifs. Toutes
les mutations restent en mémoire. Le résultat attendu est `simulation-passed`,
avec zéro appel réseau réel, dépense, écriture distante, fusion et déploiement.
Il ne vérifie pas l'état réel des issues ou des protections GitHub.

La politique réelle reste désactivée, limitée à 5 CAD/mois, sans modèle,
tarifs, change, frais ou approbation de facturation. Les fixtures de protection
sont des données de tests et ne modifient aucune règle GitHub. Les minutes
GitHub Actions sont distinctes du budget d'API IA.

## État de cette préparation

Aucune fusion et aucune activation effective du calendrier sur main ne sont
réalisées par la création de cette PR. Une revue humaine indépendante et les
contrôles obligatoires sont requis par la protection de main. Ne pas contourner
ces protections et ne pas activer de fusion automatique.

La PR ne modifie aucune intégration d'hébergement. Avant une fusion ultérieure,
vérifier les déploiements automatiques existants, notamment Pages sur main :
ils sont distincts du simulateur, qui ne comporte aucune étape de déploiement.
