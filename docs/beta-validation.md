# Validation de la bêta

Exécuter avec Node.js 24 et les dépendances du projet installées :

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run check:artifacts
```

`npm test` découvre les fichiers `*.test.ts`, `*.test.mjs` et `*.test.cjs`
uniquement dans `tests/`. Il exclut les fichiers `*.integration.test.ts` :
ces derniers exigent une base PostgreSQL locale dédiée et l'activation
explicite de `CREATORBUSINESSAI_INTEGRATION_TEST=enabled`.
Les sauvegardes ne sont ni exécutées ni corrigées.
Elles sont également exclues des traces de déploiement Next.js.
`check:artifacts` vérifie cette exclusion sur un build terminé et contrôle
que les quatre fichiers nécessaires au modèle Builder restent présents.

Les nouveaux tests des routes simulent Clerk, les fournisseurs IA et la base.
Ils vérifient les refus avant consommation IA, les erreurs d'entrée,
l'autorisation du projet Builder et l'isolation des vidéos entre utilisateurs.
Ils ne remplacent pas une recette avec les comptes Clerk de préproduction.

## Protections présentes

- Connexion exigée par les routes IA publiques identifiées lors de l'audit.
- Consultation et téléchargement vidéo réservés au propriétaire enregistré
  côté serveur ; anciennes vidéos sans association refusées.
- Vérification du projet Builder avant génération payante.
- JSON limité à 64 Kio et champs texte à 12 000 caractères sur les routes
  research, orchestrator, business-builder et ai-router.
- Images limitées à 10 Mio par fichier, formats déclarés PNG/JPEG/WebP,
  tailles et qualités autorisées vérifiées ; masque requis en mode masque.
- Audio limité à 20 Mio avec vérification du format déclaré.
- Business Factory limitée à 12 livrables par exécution.
- Exécution locale du code généré toujours désactivée en production.

Les limites applicatives des fichiers interviennent après analyse du multipart,
en plus du contrôle du Content-Length lorsqu'il est présent. Configurer aussi
une limite du corps HTTP dans l'hébergement pour les envois sans taille annoncée.
Le type MIME déclaré ne garantit pas la validité du contenu ; le fournisseur
effectue également ses propres validations.

## Conditions avant une ouverture publique

- Définir les budgets fournisseur et une limitation de fréquence partagée
  entre instances : l'authentification et les plafonds par requête ne constituent
  pas un quota de consommation par utilisateur.
- Effectuer une recette avec deux utilisateurs : génération, statut et
  téléchargement d'une vidéo, puis refus d'accès depuis l'autre compte.
- Vérifier les erreurs de configuration Clerk, PostgreSQL et clés fournisseur
  dans un environnement de préproduction, sans exposer les secrets.
- Traiter la dette ESLint préexistante dans les pages et les anciens tests.
  Les règles restent actives ; aucune validation globale du lint n'est revendiquée.
- Conserver les verrous existants du Builder et de l'approbation des modèles
  tant que leurs parcours de production ne sont pas finalisés.

La compilation utilise `next/font/google` : les polices doivent être accessibles
pendant le build, ou déjà disponibles dans le cache du système de compilation.
Dans un environnement qui interdit les ports locaux utilisés par Turbopack,
la commande de validation alternative est `npm run build -- --webpack`.
