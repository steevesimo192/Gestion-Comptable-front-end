# Gestion comptable — état des lieux fonctionnel

Ce document répertorie tout ce qui est **réellement fonctionnel** dans l'application à
ce jour, pour éviter de chercher une fonctionnalité qui n'existe pas ou de refaire une
fonctionnalité qui existe déjà. Il correspond à `src.zip` tel que livré, et suit la
numérotation des parcours du fichier `user-flows-gestion-comptable.md` (7 parcours au
total : **1 à 4 sont implémentés, 5 à 7 ne le sont pas encore**).

Stack : Angular 22 (signaux, `@if`/`@for`/`@switch`, composants standalone), Tailwind
CSS 4, aucune dépendance backend — tout tourne sur des données fictives et
`localStorage`, décrites plus bas.

---

## 1. Comment le projet est organisé

```
src/app/
├── core/            logique métier, stores (signaux), données de démonstration
├── layout/          sidebar, topbar (communs à toutes les pages)
├── pages/           une page = un parcours (wizard multi-étapes ou tableau de bord)
├── widgets/         un widget = une étape de wizard, ou une carte du tableau de bord
└── shared/icon/     icônes SVG inline (voir liste au §7)
```

**Convention centrale du projet** : toute la logique métier (calculs, validations,
formats, parsing) vit dans des fichiers `core/*.ts` **purs**, sans aucune dépendance
Angular (pas de `signal`, pas d'`@Injectable`). Les stores (`*-store.ts`, avec
`@Injectable({ providedIn: 'root' })`) ne font qu'orchestrer cette logique avec des
signaux. Les composants ne font que lire le store et déclencher ses méthodes. Cette
séparation permet de tester la logique sans lancer Angular — merci de la respecter pour
toute nouvelle fonctionnalité : **la logique va dans un fichier `*-logic.ts` testable,
jamais directement dans un store ou un composant.**

Chaque fichier `core/*.ts` non trivial a son fichier `*.spec.ts` jumeau. Les fichiers de
logique pure (`money.ts`, `entry-logic.ts`, `lettrage-logic.ts`, `bank-logic.ts`) et les
stores complets sont testés et passent (163 tests au total, exécutés hors Angular faute
de CLI disponible côté génération — **`ng test` n'a jamais été lancé sur ce projet**,
à faire avant toute mise en production). Les composants ont leurs specs écrites mais
non exécutées pour la même raison : à vérifier avec `ng test` / `ng build`.

---

## 2. Le tableau de bord (`/`, page `dashboard`)

**Entièrement fonctionnel pour les parties suivantes :**
- **Sélecteur de dossier** (topbar) : 5 dossiers de démonstration dans `core/mock-data.ts`
  (`SEEDS`), chacun avec son propre jeu de données. Changer de dossier recharge tout le
  tableau de bord (`DashboardStore.selectDossier()`).
- **Sélecteur de rôle** (topbar) : bascule Comptable / Dirigeant
  (`DashboardStore.setRole()`). Le rôle Dirigeant masque les sections « Clôture » et
  « Historique et contrôle », et ne montre que les alertes urgentes marquées
  `audience: 'tous'`.
- **Alertes** (`widgets/alerts`) et **raccourcis** (`widgets/shortcuts`) : cliquables et
  reliés aux vraies pages quand la page existe (tâche « Lettrer » → `/tresorerie/lettrages`,
  « Rapprocher » → `/tresorerie/rapprochements`, raccourcis « Saisir une écriture »,
  « Lettrer un règlement », « Rapprocher la banque »). Les tâches sans page correspondante
  (ex. « Clôturer », parcours 5) restent des boutons inertes — normal, la page n'existe pas.

**Purement décoratif / lecture seule (données fictives statiques, aucune interaction)**,
à ne pas chercher à « corriger » si une valeur semble figée :
- `widgets/kpi-card` — chiffres clés en haut de page
- `widgets/cashflow-chart` — graphique de trésorerie
- `widgets/aging` — balance âgée clients/fournisseurs
- `widgets/budget` — suivi budgétaire
- `widgets/tax` — carte TVA (aperçu, pas le parcours 7)
- `widgets/closing` — carte clôture de période (aperçu, pas le parcours 5)
- `widgets/entries` — dernières écritures (liste statique, pas connectée au parcours 2)
- `widgets/audit` — journal d'audit (liste statique)

Ces huit widgets affichent les données précalculées dans `core/mock-data.ts`
(`buildDashboard()`). Si on veut un jour les rendre interactifs, ce sera un nouveau
parcours (les user-flows ne les couvrent pas explicitement en dehors des parcours 5/6/7).

---

## 3. Parcours 1 — Créer un dossier comptable (`/dossiers/nouveau`)

Wizard à 4 étapes (`DossierWizardStore`, `pages/dossier-wizard`) :

1. **Informations du dossier** — entreprise (liste `COMPANIES`), code dossier (regex
   `^[A-Z0-9-]{3,12}$`, unicité vérifiée contre les dossiers existants via
   `codeTakenValidator`), nom.
2. **Référentiel & devises** — référentiel comptable (`REFERENTIALS`), devise de tenue
   (`CURRENCIES`).
3. **Multi-devises** *(optionnelle)* — devises secondaires additionnelles.
4. **Exercice comptable** — dates de début/fin d'exercice.

Écran de confirmation récapitulatif avant validation finale. Toutes les données viennent
de `core/wizard-data.ts`. **Fonctionnel de bout en bout**, y compris la validation de
code dossier dupliqué.

---

## 4. Parcours 2 — Saisir une écriture comptable (`/ecritures/nouvelle`)

Wizard à 4 étapes (`EntryWizardStore`, `pages/entry-wizard`), logique pure dans
`core/entry-logic.ts` :

1. **Informations générales** — journal (`JOURNALS`), date, numéro de pièce, libellé.
   Une date dans une période clôturée bloque le passage à l'étape suivante
   (`periodLocked()`).
2. **Lignes de l'écriture** — autant de lignes que nécessaire (minimum 2), chacune avec
   compte (recherche dans `CHART_OF_ACCOUNTS`, ~13 comptes de démonstration), libellé,
   débit **ou** crédit (jamais les deux, jamais négatif). Le menu de sélection de compte
   est positionné en `fixed` pour ne jamais être tronqué par le tableau scrollable.
   `postBlockers()` liste en français tout ce qui empêche de continuer (compte manquant,
   débit ≠ crédit, montant négatif…).
3. **Confirmation** — récapitulatif, re-vérification de `canPost()` au moment du clic
   (la période a pu être verrouillée entre-temps), protection anti-double-clic.
4. **Résultat** — écriture comptabilisée avec référence, ou écriture enregistrée en
   brouillon.

**Brouillons** : sauvegardés dans `localStorage` (`gc.entry-wizard.draft.v1`), proposés
au rechargement de la page, résistants à un brouillon corrompu (normalisation stricte à
la lecture). « Saisir une nouvelle écriture » préserve un brouillon qu'on vient
d'enregistrer plutôt que de l'écraser.

**Fonctionnel de bout en bout**, y compris persistance du brouillon entre sessions.

---

## 5. Parcours 3 — Lettrer un règlement avec une facture (`/tresorerie/lettrages`)

Wizard à 4 étapes (`LettrageStore`, `pages/lettrage-wizard`), logique pure dans
`core/lettrage-logic.ts` :

1. **Choix du tiers** — recherche par nom ou code parmi les tiers extraits du plan de
   comptes (cohérence garantie avec le parcours 2). Affiche le nombre de lignes en
   attente par tiers, y compris un tiers volontairement vide (401169) pour tester l'état
   « rien à lettrer ».
2. **Lignes à lettrer** — deux colonnes factures / paiements avec cases à cocher.
   Indicateur temps réel : correspondance **exacte** (vert), **partielle** (orange, avec
   calcul du reste et du côté où il reste — facture ou paiement), ou **incomplète**
   (bleu, un seul côté coché).
3. **Confirmation** — affichée uniquement pour un lettrage **partiel** (un lettrage exact
   se valide en un clic, sans confirmation, conformément au user-flow).
4. **Résultat** — code de lettrage attribué (A, B, … Z, AA…), montant lettré, reste dû
   ou trop-perçu affiché en langage courant selon qu'il s'agit d'un client ou d'un
   fournisseur. **Annulation** possible avec confirmation dédiée, tracée dans un
   historique (`auditTrail`), jamais annulable deux fois.

L'allocation d'un paiement sur plusieurs factures suit un ordre FIFO (date, puis
référence, puis id) et ne dépasse jamais le montant restant d'une ligne.

**Fonctionnel de bout en bout**, y compris l'historique d'annulation.

---

## 6. Parcours 4 — Rapprocher un relevé bancaire (`/tresorerie/rapprochements`)

Wizard à 5 étapes + résultat (`BankReconciliationStore`, `pages/bank-wizard`), logique
pure dans `core/bank-logic.ts` (la plus volumineuse du projet : parsing, dates, montants,
suggestions, soldes) :

1. **Relevé** — compte bancaire, période, soldes initial/final, puis les opérations,
   par **import CSV** (glisser-déposer ou sélection de fichier, détection automatique du
   séparateur `;`/`,`/tabulation, colonnes Date/Libellé/Montant **ou**
   Date/Libellé/Débit/Crédit, avec ou sans en-tête, montants et dates au format français
   ou international) ou **saisie manuelle** ligne par ligne. Bouton « Charger un relevé
   d'exemple » pour tester sans fichier. Détection de doublon (même compte + même
   période, ou mêmes opérations sous une autre période).
2. **Suggestions automatiques** — pour chaque opération, recherche de l'écriture de même
   montant à une date proche (fenêtre de 7 jours), avec score combinant l'écart de dates
   et la similarité des libellés (mots vides bancaires ignorés : « vir », « prlv »,
   « règlement »…). Séparées en « correspondances sûres » (validables d'un clic, ou
   toutes ensemble) et « à vérifier » (montant identique mais plusieurs candidates ou
   dates éloignées).
3. **Rapprochement manuel** — recherche dans les deux colonnes, association de
   **plusieurs** écritures à une seule opération (le total coché doit tomber exactement
   juste), **création d'une écriture manquante** (compte de contrepartie suggéré
   automatiquement pour les frais bancaires), ou mise en attente avec **note
   obligatoire** (« à investiguer »).
4. **Récapitulatif** — compteurs par type de traitement (auto / manuel / à investiguer /
   écritures créées), écarts listés un par un, écart final expliqué poste par poste
   (opérations non traitées, écritures non rapprochées).
5. **Clôture** — dernière vérification, confirmation dédiée, bloquée tant qu'il reste des
   opérations non traitées. **Définitive** : un relevé clôturé redevient consultable en
   lecture seule depuis l'étape 1, jamais modifiable.
6. **Résultat** — bilan complet, **export du rapport en CSV** (`buildReportCsv()`),
   relevé détaillé consultable/masquable.

Une opération laissée « à investiguer » reste visible au rapprochement suivant du même
compte (voir le relevé d'août déjà clôturé dans les données de démonstration, avec une
opération non identifiée reportée). Un rapprochement en cours peut être **repris** ou
**abandonné** (avec confirmation) depuis l'étape 1.

**Fonctionnel de bout en bout**, y compris la persistance en `localStorage`
(`gc.bank-reconciliation.v1`) entre sessions.

---

## 7. Ce qui n'existe PAS encore

Ces trois parcours des user-flows n'ont **aucune implémentation**, ni page, ni store, ni
route :

- **Parcours 5 — Clôturer une période comptable.** Seule existe la carte statique
  `widgets/closing` sur le tableau de bord (données fictives, non cliquable).
- **Parcours 6 — Consulter un solde de compte.** Rien n'existe, pas même un aperçu.
- **Parcours 7 — Préparer une déclaration fiscale.** Seule existe la carte statique
  `widgets/tax` sur le tableau de bord (données fictives, non cliquable).

Attention à ne pas confondre ces cartes du tableau de bord avec de vraies pages : elles
n'ont ni route, ni store, ni logique derrière.

---

## 8. Éléments transverses réutilisables

- **`shared/icon`** — jeu d'icônes SVG inline (`<app-icon name="...">`), palette
  fermée (voir `icon.ts` pour la liste complète des noms disponibles avant d'en
  inventer un nouveau).
- **`widgets/wizard-progress`** — barre d'étapes cliquable réutilisée par les 3 wizards
  (dossier, écriture, lettrage) et le rapprochement bancaire ; `listLabel` paramétrable
  pour l'accessibilité.
- **`core/money.ts`** — arrondi au centime, sommes sans dérive flottante
  (`roundMoney`, `sumMoney`) : à utiliser pour **tout** nouveau calcul de montant.
- **Styles (`styles.css`)** — classes utilitaires `.btn` / `.btn-primary` / `.btn-quiet`
  / `.btn-success` / `.btn-warn` / `.btn-link`, `.badge-*`, `.panel`, `.action-bar` /
  `.action-group` (barre d'actions bas de page, secondaire à gauche / primaire à
  droite). Couleurs de marque dans `--color-brand-*` (violet, inspiré de
  primecorn.net), à ne pas dupliquer en dur dans un composant.
- **Formats FCFA** — `formatFcfa()` / `formatSignedFcfa()` (dans `bank-logic.ts`, mais
  utilisables partout) : espace insécable, vrai signe moins (`−`), jamais de décimales.

---

## 9. Ce qu'il reste à vérifier avant mise en production

- Lancer `ng build` et `ng test` — jamais exécutés faute d'Angular CLI dans
  l'environnement où ce projet a été généré.
- Les fichiers `*.spec.ts` des composants (tous les wizards et leurs étapes) sont écrits
  mais non exécutés : à confirmer qu'ils passent.
