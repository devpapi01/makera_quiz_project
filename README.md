# Makera Workspace — V3

Nouvelle application indépendante de la V2 : React 19, TypeScript, Vite, Tailwind CSS 4 et Supabase. Elle reprend le langage visuel de la V2 et ouvre l’espace candidat à de nouveaux outils de travail.

## Espaces inclus

- **Connexion privée** : pas de formulaire d’inscription publique, activation par invitation et récupération du mot de passe par e-mail. Deux profils de démonstration sont disponibles uniquement en mode local.
- **Candidat** : tableau de bord, questionnaire Makera de 56 affirmations et 8 réflexions, sauvegarde de progression, résultats, export PDF du business model, et carnet de notes privé.
- **Administration** : invitation nominative par e-mail, gestion de l’autorisation individuelle, ouverture générale du questionnaire, fiche candidat détaillée et plans d’action enregistrés par passation. La fiche produit un rapport imprimable que l’administrateur peut enregistrer en PDF.
- **Mode sombre** : mémorisé dans le navigateur et disponible depuis l’écran de connexion comme depuis l’application.

## Pages et navigation

L’application reste une SPA React : chaque espace dispose de son URL directe sans recharger l’application. Les chemins sont centralisés dans `src/lib/routes.ts`, les écrans sont isolés dans `src/pages/WorkspacePages.tsx`, et la page d’adresse inconnue est dans `src/pages/NotFoundPage.tsx`.

| Écran | Chemin |
| --- | --- |
| Connexion | `/` ou `/connexion` |
| Activation et récupération du mot de passe | `/invite/accept` |
| Vue d’ensemble | `/app` |
| Questionnaire | `/app/questionnaire` |
| Résultats | `/app/resultats` |
| Business model | `/app/business-model` |
| Notes | `/app/notes` |
| Administration des candidats | `/app/candidats` |
| Fiche détaillée d’un candidat | `/app/candidats/:id` |
| Chemin inconnu | page 404 |

Les boutons précédent/suivant du navigateur suivent la navigation dans l’espace. L’hébergeur doit renvoyer les chemins applicatifs vers `index.html` (fallback SPA) pour que l’ouverture directe ou le rechargement d’une URL comme `/app/notes` charge l’application.

## Démarrage local

Prérequis : Node.js 20.19+ ou 22.12+ et npm.

```powershell
cd v3
npm install
npm run dev
```

En l’absence de variables Supabase, l’app utilise deux profils fictifs en mémoire locale :

| Profil         | E-mail                 | Mot de passe      |
| -------------- | ---------------------- | ----------------- |
| Administration | `admin@makera.demo`    | `MakeraDemo2026!` |
| Candidat       | `candidat@makera.demo` | `MakeraDemo2026!` |

Les données démo restent dans le stockage du navigateur. **Ce mode n’est pas adapté aux données réelles.** Dès que les deux variables Supabase sont définies, l’authentification démo est désactivée.

## Raccordement Supabase

1. Créer un projet Supabase et définir `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans un fichier `.env.local` copié depuis `.env.example`. `VITE_SENTRY_DSN` est optionnel en local et ne remplace pas les deux variables Supabase. Les clés côté navigateur sont publiques/publishable ; ne jamais y mettre la clé `service_role`.
2. Appliquer les migrations de `supabase/migrations` dans l’ordre chronologique avec Supabase CLI (`npx supabase db push`) ou en exécutant chaque fichier une seule fois dans le SQL Editor Supabase. La migration `202611260001_candidate_action_plans.sql` crée le stockage des plans d’action réservé aux admins.
3. Dans **Authentication → URL Configuration**, définir l’URL du site puis autoriser les redirections `https://adresse-de-ton-app/invite/accept` et, en développement, `http://localhost:5173/invite/accept`. Dans les réglages Auth, désactiver l’inscription publique et configurer le service d’e-mail. Régler l’expiration des liens d’invitation sur 24 heures et adapter le modèle d’e-mail d’invitation à l’URL `/invite/accept`. Le bouton « Mot de passe oublié ? » est déjà intégré ; il utilise cette même route de retour pour permettre au candidat de définir son nouveau mot de passe.
4. Créer le premier utilisateur admin dans Authentication avec ta véritable adresse e-mail. La migration laisse les comptes créés hors invitation sans profil ; dans le SQL Editor, promouvoir précisément ce compte :

   ```sql
   insert into public.profiles (id, email, name, role, authorized)
   select id, lower(email), 'Équipe Makera', 'admin', true
   from auth.users where lower(email) = lower('TON-ADRESSE@exemple.com')
   on conflict (id) do update set role = 'admin', authorized = true;
   ```

   Faire cette opération uniquement pour l’adresse admin choisie. Le rôle n’est jamais modifiable depuis l’interface.

5. Déployer la fonction d’invitation. Après `npx supabase login`, lier le projet puis appliquer la migration. Définir `APP_SITE_URL` côté fonction ; Supabase injecte les secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` dans l’environnement de fonction.

   ```powershell
   npx supabase link --project-ref TON_PROJECT_REF
   npx supabase db push
   npx supabase functions deploy create-invitation
   npx supabase secrets set APP_SITE_URL=https://adresse-de-ton-app
   ```

Les liens d’invitation sont envoyés avec Supabase Auth. La fonction ne retourne jamais la clé privée au navigateur, vérifie le rôle admin, valide les champs et refuse les comptes existants. Une invitation est consignée, expire au bout de 24 heures et permet au candidat de choisir son mot de passe. Après activation, l’admin autorise le candidat à commencer le questionnaire.

## Données et sécurité

Le schéma PostgreSQL active RLS sur toutes les tables. Un candidat ne peut lire ou modifier que ses propres notes, modèles et passations. L’administration peut lire les dossiers candidats, mais les mots de passe restent gérés par Supabase Auth. Le navigateur ne peut pas attribuer un rôle admin. Le serveur vérifie l’autorisation, l’éligibilité et l’ouverture globale avant l’enregistrement d’une passation. Le score final global est calculé dans PostgreSQL.

Ne jamais ajouter la clé `service_role` à `VITE_*`, au code client ou aux variables publiques de Base44. Les invitations passent uniquement par la fonction Supabase Edge.

## Vérifications

```powershell
npm run typecheck
npm run test
npm run build
```

Les tests unitaires couvrent le nombre de questions, l’absence de score incomplet et les bornes du calcul. Le projet reste séparé de `v2/` pour garder les deux versions disponibles pendant la migration.

## Performance, charge et exploitation

- La liste admin charge 25 candidats par page et ne récupère les passations que pour la page affichée. Une fonction SQL admin renvoie les compteurs globaux et le dernier bilan de ces 25 profils, sans transférer l’historique complet des passations au navigateur.
- Les notes sont explicitement filtrées par propriétaire en plus de la RLS.
- La fiche détaillée du candidat est chargée à la demande afin de ne pas l’inclure dans le premier téléchargement.
- La migration `202611250002_performance_indexes.sql` ajoute les index des parcours admin et des compteurs de passations. `npx supabase db push` applique les migrations restantes.
- GitHub Actions exécute `npm ci`, le contrôle TypeScript, les tests unitaires et le build sur chaque push et pull request.
- Depuis l’espace admin, export CSV de toute la liste et import CSV/XLSX avec aperçu, validation et détection des comptes ou invitations existants. L’import réutilise `create-invitation` et respecte sa limite de 5 invitations par minute ; si cette fonction retourne une réponse 429, l’interface attend puis réessaie. Un refus du fournisseur e-mail apparaît comme un échec de ligne et nécessite la configuration SMTP/quotas dans Supabase.

Le fichier de candidats peut contenir `E-mail` seul, ou les colonnes `Nom`, `E-mail`, `Projet`. Les noms absents sont déduits prudemment de la partie avant `@` et un projet commun peut être saisi avant l’envoi. Le format `.xls` historique n’est pas accepté ; dans Excel, enregistrer le classeur au format `.xlsx` ou `.csv`. Le fichier est limité à 5 Mo et 50 lignes par import. L’import n’envoie que les lignes valides ; doublons et lignes invalides sont affichés avant confirmation. La fonction limite les invitations à 5 par minute. Le quota du fournisseur e-mail Supabase dépend de sa configuration ; configurer un SMTP personnalisé pour les formations et lots importants.

Un scénario k6 en lecture seule est disponible dans `tests/load/reads.js`. Il simule jusqu’à 50 utilisateurs connectés sur les lectures usuelles du candidat et la coquille de l’application. Il est destiné à un environnement de préproduction avec un compte candidat de test dédié, jamais à la production ni à des données réelles. Installe k6, puis dans PowerShell :

```powershell
$env:APP_URL = "https://adresse-de-preproduction"
$env:SUPABASE_URL = "https://identifiant.supabase.co"
$env:SUPABASE_ANON_KEY = "cle-publique-de-preproduction"
$env:LOAD_TEST_EMAIL = "candidat-test@exemple.com"
$env:LOAD_TEST_PASSWORD = "mot-de-passe-du-compte-de-test"
k6 run tests/load/reads.js
```

Le scénario échoue si le taux d’erreur dépasse 1 % ou si le p95 des requêtes dépasse 800 ms. Ce sont des seuils initiaux à confronter à la latence de base et à ajuster aux objectifs métier. Ce test vérifie les lectures et le chargement HTTP ; il ne simule pas les invitations e-mail ni les écritures concurrentes du questionnaire.

### Monitoring de préproduction et production

Dans Supabase Studio, suivre les rapports Database, API et Auth : latence et erreurs, requêtes lentes, CPU/mémoire, connexions et croissance disque. Examiner Performance Advisor après les tests de charge et à chaque évolution importante du schéma. Les mesures Supabase ne couvrent pas les erreurs d’interface dans le navigateur.

Pour le suivi navigateur, créer un projet React dans Sentry puis copier son DSN dans la variable Base44 `VITE_SENTRY_DSN`. Le SDK est initialisé dans `src/instrumentation.ts` et les erreurs React 19 sont reliées à Sentry dans `src/main.tsx`. Sans DSN, l’intégration reste inactive. Aucune capture vidéo de session ni donnée personnelle par défaut n’est activée. Restreindre les domaines autorisés dans Sentry et ne jamais enregistrer les réponses au questionnaire, notes, mots de passe, jetons ou contenu des champs dans les événements. Les alertes, la rétention des journaux, les quotas, le plan de ressources et les sauvegardes/restaurations restent à configurer dans les consoles Base44 et Supabase : ils dépendent des comptes et plans choisis.

Avant ouverture réelle : exécuter ce scénario en préproduction, inspecter les rapports et la capacité de connexion Supabase, vérifier les alertes, puis faire un exercice de restauration de sauvegarde. Augmenter progressivement le nombre de VUs selon le trafic attendu ; ne pas lancer un test de charge contre les utilisateurs ou données de production.

## Base44

Importer le dossier `v3` comme application Vite/React, ajouter les variables publiques Supabase dans l’environnement de l’application, puis déployer la fonction et le schéma Supabase séparément. Le secret `service_role` reste exclusivement côté fonction Supabase. Vérifier également que le chemin de redirection `/invite/accept` est autorisé dans les réglages Auth du projet.

(utilse le meme design du repo ici aussi ne change rien a ce niveau design juste connecte la base de données supabase permet le deploiment et arrange les toggle bouton cote admin pour ouvrir le quiz et l'activation des candidats reprend ce qui est affiche dans le repo a l'identique pour tout ce qui est affichage et il y'a plein de bugs dans les chargement de pages et consort je vois (vue d'ensemble et la page des candidats) alors que le suis connecte comme candidat )
