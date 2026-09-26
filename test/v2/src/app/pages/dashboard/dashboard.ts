import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardStore } from '../../core/dashboard-store';
import { KpiCard } from '../../widgets/kpi-card/kpi-card';
import { Alerts } from '../../widgets/alerts/alerts';
import { Shortcuts } from '../../widgets/shortcuts/shortcuts';
import { CashflowChart } from '../../widgets/cashflow-chart/cashflow-chart';
import { Aging } from '../../widgets/aging/aging';
import { Budget } from '../../widgets/budget/budget';
import { Closing } from '../../widgets/closing/closing';
import { Tax } from '../../widgets/tax/tax';
import { Entries } from '../../widgets/entries/entries';
import { Audit } from '../../widgets/audit/audit';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, KpiCard, Alerts, Shortcuts, CashflowChart, Aging, Budget, Closing, Tax, Entries, Audit, Icon],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  protected readonly store = inject(DashboardStore);
  protected readonly d = this.store.data;
  protected readonly isAccountant = computed(() => this.store.role() === 'comptable');

  /** Sommaire : permet de sauter directement à une partie de la page. */
  protected readonly sections = computed(() => {
    const list = [
      { id: 'a-traiter', label: 'À traiter' },
      { id: 'situation', label: 'Situation financière' },
      { id: 'suivi', label: 'Suivi de la période' },
    ];
    if (this.isAccountant()) list.push({ id: 'historique', label: 'Historique et contrôle' });
    return list;
  });
}
