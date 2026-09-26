import { Component, computed, input, signal } from '@angular/core';
import { CashflowPoint } from '../../core/models';
import { FcfaPipe } from '../../core/fcfa-pipe';

function niceScale(max: number, ticks = 4) {
  const raw = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { step, max: step * ticks, ticks };
}

@Component({
  selector: 'app-cashflow-chart',
  imports: [FcfaPipe],
  templateUrl: './cashflow-chart.html',
  styleUrl: './cashflow-chart.css',
})
export class CashflowChart {
  readonly points = input.required<CashflowPoint[]>();

  protected readonly W = 720;
  protected readonly H = 270;
  protected readonly L = 44;
  protected readonly R = 8;
  protected readonly T = 12;
  protected readonly B = 34;

  protected readonly active = signal(-1);

  protected readonly current = computed(() => {
    const p = this.points();
    return p[this.active()] ?? p[p.length - 1];
  });

  protected readonly gap = computed(() => this.current().inflow - this.current().outflow);

  private readonly scale = computed(() => {
    const max = Math.max(...this.points().flatMap((p) => [p.inflow, p.outflow]));
    return niceScale(max);
  });

  protected readonly ticks = computed(() => {
    const sc = this.scale();
    const unit = sc.max >= 1_000_000 ? 1_000_000 : 1_000;
    const suffix = unit === 1_000_000 ? ' M' : ' k';
    const plotH = this.H - this.T - this.B;
    return Array.from({ length: sc.ticks + 1 }, (_, i) => {
      const v = i * sc.step;
      return {
        v,
        y: this.T + plotH - (v / sc.max) * plotH,
        label: (v / unit).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + suffix,
      };
    });
  });

  protected readonly bars = computed(() => {
    const pts = this.points();
    const sc = this.scale();
    const plotW = this.W - this.L - this.R;
    const plotH = this.H - this.T - this.B;
    const band = plotW / pts.length;
    const w = Math.min(34, band * 0.3);
    return pts.map((p, i) => {
      const x = this.L + i * band;
      const cx = x + band / 2;
      const inH = (p.inflow / sc.max) * plotH;
      const outH = (p.outflow / sc.max) * plotH;
      return {
        month: p.month,
        partial: !!p.partial,
        x,
        band,
        w,
        inX: cx - w - 2,
        outX: cx + 2,
        inH,
        outH,
        inY: this.T + plotH - inH,
        outY: this.T + plotH - outH,
      };
    });
  });

  protected readonly totalIn = computed(() => this.points().reduce((a, p) => a + p.inflow, 0));
  protected readonly totalOut = computed(() => this.points().reduce((a, p) => a + p.outflow, 0));

  protected readonly summary = computed(() => {
    const pts = this.points();
    return `Graphique en barres des encaissements et décaissements mensuels, de ${pts[0].month} à ${pts[pts.length - 1].month}`;
  });
}
