import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { DossierWizard } from './pages/dossier-wizard/dossier-wizard';

export const routes: Routes = [
  { path: '', component: Dashboard, title: 'Tableau de bord | Gestion comptable' },
  { path: 'dossiers/nouveau', component: DossierWizard, title: 'Nouveau dossier comptable | Gestion comptable' },
  { path: '**', redirectTo: '' },
];
