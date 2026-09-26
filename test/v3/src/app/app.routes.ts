import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { DossierWizard } from './pages/dossier-wizard/dossier-wizard';
import { EntryWizard } from './pages/entry-wizard/entry-wizard';
import { LettrageWizard } from './pages/lettrage-wizard/lettrage-wizard';

export const routes: Routes = [
  { path: '', component: Dashboard, title: 'Tableau de bord | Gestion comptable' },
  { path: 'dossiers/nouveau', component: DossierWizard, title: 'Nouveau dossier comptable | Gestion comptable' },
  { path: 'ecritures/nouvelle', component: EntryWizard, title: 'Nouvelle écriture | Gestion comptable' },
  { path: 'tresorerie/lettrages', component: LettrageWizard, title: 'Lettrage | Gestion comptable' },
  { path: '**', redirectTo: '' },
];
