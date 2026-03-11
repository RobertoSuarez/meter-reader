import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="dashboard-container">
      <header class="header">
        <div class="header-left">
          <div class="logo-mark">⚡</div>
          <div>
            <h1>Lecturas de Luz</h1>
            <span class="subtitle-header">Control de consumo eléctrico</span>
          </div>
        </div>
        <button class="logout-btn" (click)="logout()">↩ Salir</button>
      </header>

      <main class="content">

        <!-- Meter Selector -->
        <section class="meter-bar" *ngIf="meters().length > 0; else noMeters">
          <div class="meter-selector">
            <span class="selector-label">📟 Medidor:</span>
            <select [ngModel]="selectedMeter()?.id" (ngModelChange)="selectMeter($event)">
              <option *ngFor="let meter of meters()" [value]="meter.id">{{ meter.name }}</option>
            </select>
            <button class="chip-btn" (click)="showNewMeterFormula = !showNewMeterFormula">
              {{ showNewMeterFormula ? '✕ Cancelar' : '＋ Nuevo' }}
            </button>
          </div>

          <div class="new-meter-form" *ngIf="showNewMeterFormula">
            <input type="text" [(ngModel)]="newMeterName" placeholder="Nombre del medidor (ej. Casa)">
            <button class="chip-btn accent" (click)="createMeter()" [disabled]="!newMeterName">Guardar</button>
          </div>
        </section>

        <!-- Stats Cards -->
        <section class="stats-section" *ngIf="meters().length > 0">
          <div class="stats-grid">
            <div class="stat-card blue">
              <div class="stat-icon">🔋</div>
              <div class="stat-body">
                <p class="stat-label">Consumo desde corte</p>
                <div class="stat-value">{{ consumptionSinceCutoff() }} <span>kWh</span></div>
                <p class="stat-note">Desde el {{ billingPeriodStart() | date:'dd MMM' }} (corte)</p>
              </div>
            </div>
            <div class="stat-card yellow">
              <div class="stat-icon">💰</div>
              <div class="stat-body">
                <p class="stat-label">Costo de energía</p>
                <div class="stat-value">\${{ energyCost() | number:'1.2-2' }}</div>
                <p class="stat-note">Solo energía, sin cargos fijos</p>
              </div>
            </div>
            <div class="stat-card green">
              <div class="stat-icon">📅</div>
              <div class="stat-body">
                <p class="stat-label">Días para corte</p>
                <div class="stat-value">{{ daysUntilCutoff() }}</div>
                <p class="stat-note">Corte el día {{ selectedMeter()?.billing_day }} de cada mes</p>
              </div>
            </div>
          </div>

          <!-- Tariff Info + Billing Projection -->
          <div class="projection-grid">

            <!-- Tariff Breakdown -->
            <div class="panel tariff-panel">
              <h3 class="panel-title">⚡ Tarifa ARCONEL (Ecuador)</h3>
              <p class="panel-subtitle">CNEL Guayas Los Ríos · BTCRSD01 · Bloque escalado</p>
              <table class="tariff-table">
                <thead>
                  <tr><th>Bloque</th><th>kWh</th><th>Precio</th></tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of tariffs()" [class.active-tier]="isActiveTier(t)">
                    <td>
                      <span class="tier-dot" [class.active]="isActiveTier(t)"></span>
                      {{ t.range_min }}–{{ t.range_max ?? '∞' }}
                    </td>
                    <td>{{ t.range_min }}–{{ t.range_max ?? '...' }} kWh</td>
                    <td class="tier-rate">\${{ t.rate | number:'1.3-3' }}/kWh</td>
                  </tr>
                </tbody>
              </table>
              <div class="tariff-note">
                <span>📦 Comercialización</span><span>\${{ selectedMeter()?.fixed_charge_comercializacion | number:'1.2-2' }}/mes</span>
              </div>
              <div class="tariff-note">
                <span>💡 Alumbrado Público</span><span>\${{ selectedMeter()?.fixed_charge_alumbrado | number:'1.2-2' }}/mes</span>
              </div>
              <div class="tariff-note subsidy-info">
                <span>🏛️ Subsidio (ya en tarifas)</span><span>\${{ selectedMeter()?.subsidy_amount | number:'1.2-2' }}/mes *ref.</span>
              </div>
              <div class="tariff-note highlight">
                <span>Consumo desde el corte</span>
                <span><strong>{{ consumptionSinceCutoff() }} kWh → Bloque {{ activeTierLabel() }}</strong></span>
              </div>
            </div>

            <!-- Billing Projection -->
            <div class="panel projection-panel">
              <h3 class="panel-title">📊 Proyección de Planilla</h3>
              <p class="panel-subtitle">
                Período: {{ billingPeriodStart() | date:'dd MMM' }} → {{ billingCutoffDate() | date:'dd MMM yyyy' }}
              </p>

              <div class="proj-row">
                <span>Días transcurridos</span>
                <span class="proj-val">{{ daysElapsed() }} / {{ totalBillingDays() }}</span>
              </div>
              <div class="proj-row baseline-row" *ngIf="baselineReading()">
                <span>Lectura base ({{ baselineReading()?.reading_date | date:'dd MMM' }})</span>
                <span class="proj-val">{{ baselineReading()?.kw_value }} kWh</span>
              </div>
              <div class="proj-row">
                <span>Consumo acumulado desde corte</span>
                <span class="proj-val">{{ consumptionSinceCutoff() }} kWh</span>
              </div>
              <div class="proj-row">
                <span>Proyección al cierre</span>
                <span class="proj-val accent">{{ projectedKwh() | number:'1.0-0' }} kWh</span>
              </div>

              <div class="proj-divider"></div>
              <p class="panel-subtitle">Desglose estimado de factura</p>

              <div class="proj-row">
                <span>Energía ({{ projectedKwh() | number:'1.0-0' }} kWh)</span>
                <span class="proj-val">\${{ projectedEnergyCost() | number:'1.2-2' }}</span>
              </div>
              <div class="proj-row">
                <span>Comercialización</span>
                <span class="proj-val">\${{ selectedMeter()?.fixed_charge_comercializacion | number:'1.2-2' }}</span>
              </div>
              <div class="proj-row">
                <span>Alumbrado Público</span>
                <span class="proj-val">\${{ selectedMeter()?.fixed_charge_alumbrado | number:'1.2-2' }}</span>
              </div>
              <div class="proj-row subsidy-info-row">
                <span>🏛️ Subsidio Tarifa Eléctrica</span>
                <span class="proj-val subsidy-info-val">ya incl. en tarifas</span>
              </div>

              <div class="proj-total">
                <span>TOTAL ESTIMADO</span>
                <span class="proj-total-val">\${{ projectedTotalBill() | number:'1.2-2' }}</span>
              </div>

              <p class="proj-disclaimer">* Estimación basada en consumo promedio diario. No incluye mora ni saldo anterior.</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="action-row">
            <button class="action-btn primary" (click)="goToNewReading()">
              📸 Nueva Lectura
            </button>
            <button class="action-btn secondary" (click)="recalculate()" [disabled]="loading()">
              {{ loading() ? '⏳ Cargando...' : '↻ Recalcular' }}
            </button>
          </div>
        </section>

        <!-- Readings History -->
        <section class="history-section" *ngIf="meters().length > 0">
          <h2 class="section-title">📋 Historial de Lecturas</h2>

          <div *ngIf="loading()" class="skeleton-list">
            <div class="skeleton-item" *ngFor="let i of [1,2,3]"></div>
          </div>

          <div class="history-list" *ngIf="!loading()">
            <div class="reading-card retro" *ngFor="let reading of readings(); let i = index; let last = last"
              [class.editing]="editingReadingId() === reading.id">
              <div class="reading-thumb" *ngIf="reading.image_url">
                <img [src]="getPublicUrl(reading.image_url)" alt="Medidor" />
              </div>
              <div class="reading-thumb placeholder-thumb" *ngIf="!reading.image_url">⚡</div>

              <div class="reading-info">
                <div class="reading-main">
                  <span class="kw-badge">{{ reading.kw_value }} kWh</span>

                  <ng-container *ngIf="!last && getConsumptionDelta(i) > 0">
                    <span class="diff-badge positive">▲ +{{ getConsumptionDelta(i) }} kWh</span>
                    <span class="cost-badge positive">≈ \${{ getConsumptionCost(getConsumptionDelta(i)) | number:'1.2-2' }}</span>
                  </ng-container>

                  <ng-container *ngIf="!last && getConsumptionDelta(i) === 0">
                    <span class="diff-badge zero">→ 0 kWh</span>
                    <span class="cost-badge zero">\$0.00</span>
                  </ng-container>

                  <ng-container *ngIf="!last && getConsumptionDelta(i) < 0">
                    <span class="diff-badge negative">▼ {{ getConsumptionDelta(i) }} kWh</span>
                    <span class="cost-badge negative">≈ \${{ getConsumptionCost(getConsumptionDelta(i)) | number:'1.2-2' }}</span>
                  </ng-container>

                  <span class="first-badge" *ngIf="last">Lectura inicial</span>
                </div>

                <!-- Display mode -->
                <div class="date-row" *ngIf="editingReadingId() !== reading.id">
                  <span class="reading-date">{{ reading.reading_date | date:'dd MMM yyyy · HH:mm' }}</span>
                  <button class="edit-date-btn" (click)="startEditDate(reading)" title="Editar fecha">✏️</button>
                </div>

                <!-- Edit mode -->
                <div class="date-edit-row" *ngIf="editingReadingId() === reading.id">
                  <input type="datetime-local" [ngModel]="editingDate()" (ngModelChange)="editingDate.set($event)" class="date-input">
                  <button class="save-date-btn" (click)="saveReadingDate(reading.id)" [disabled]="savingDate()">✓</button>
                  <button class="cancel-date-btn" (click)="cancelEditDate()">✕</button>
                </div>
              </div>

              <button class="delete-btn" (click)="deleteReading(reading.id)" title="Eliminar lectura">🗑</button>
            </div>

            <div *ngIf="readings().length === 0" class="empty-readings">
              <span>📭</span>
              <p>No hay lecturas aún para este medidor.</p>
              <button class="chip-btn accent" (click)="goToNewReading()">Tomar primera lectura</button>
            </div>
          </div>
        </section>

        <!-- No Meters State -->
        <ng-template #noMeters>
          <div class="empty-state-large">
            <div class="empty-icon">🏠</div>
            <h2>Añade tu primer medidor</h2>
            <p>Comienza nombrando el lugar donde medirás tu consumo.</p>
            <div class="create-form">
              <input type="text" [(ngModel)]="newMeterName" placeholder="Ej. Casa Principal">
              <button class="chip-btn accent lg" (click)="createMeter()" [disabled]="!newMeterName">Crear Medidor</button>
            </div>
          </div>
        </ng-template>
      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap');

    /* ─── Base ─── */
    * { box-sizing: border-box; }
    .dashboard-container {
      min-height: 100vh;
      background: #fdf6ec;
      color: #2d2a26;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* ─── Header ─── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 2rem;
      background: #fff5d6;
      border-bottom: 3px solid #2d2a26;
      box-shadow: 0 3px 0 rgba(45,42,38,0.08);
    }
    .header-left { display: flex; align-items: center; gap: 0.9rem; }
    .logo-mark {
      width: 44px; height: 44px;
      background: #ffdd77;
      border: 2px solid #2d2a26;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.4rem;
      box-shadow: 3px 3px 0 #2d2a26;
    }
    .header h1 {
      margin: 0;
      font-family: 'Space Mono', monospace;
      font-size: 1.3rem;
      color: #2d2a26;
    }
    .subtitle-header { font-size: 0.78rem; color: #7a6f5f; }
    .logout-btn {
      background: #fff;
      border: 2px solid #2d2a26;
      padding: 0.45rem 1.1rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      box-shadow: 2px 2px 0 #2d2a26;
      transition: all 0.15s;
    }
    .logout-btn:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #2d2a26; }
    .logout-btn:active { transform: translate(1px,1px); box-shadow: 1px 1px 0 #2d2a26; }

    /* ─── Content ─── */
    .content { padding: 2rem; max-width: 860px; margin: 0 auto; }

    /* ─── Meter Bar ─── */
    .meter-bar { margin-bottom: 2rem; }
    .meter-selector {
      display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;
      background: #fff;
      border: 2px solid #2d2a26;
      border-radius: 12px;
      padding: 0.9rem 1.2rem;
      box-shadow: 3px 3px 0 #2d2a26;
    }
    .selector-label { font-family: 'Space Mono', monospace; font-size: 0.85rem; white-space: nowrap; }
    .meter-selector select {
      flex: 1; min-width: 160px;
      padding: 0.5rem 0.75rem;
      border: 2px solid #2d2a26;
      border-radius: 8px;
      background: #fdf6ec;
      color: #2d2a26;
      font-size: 0.95rem;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
    }
    .new-meter-form {
      display: flex; gap: 0.75rem; align-items: center;
      margin-top: 0.75rem;
      padding: 0.9rem 1.2rem;
      background: #fff;
      border: 2px dashed #aaa;
      border-radius: 12px;
    }
    .new-meter-form input {
      flex: 1; padding: 0.55rem 0.85rem;
      border: 2px solid #2d2a26;
      border-radius: 8px;
      background: #fdf6ec;
      color: #2d2a26;
      font-size: 0.95rem;
    }

    /* ─── Chip Buttons ─── */
    .chip-btn {
      padding: 0.5rem 1.1rem;
      border: 2px solid #2d2a26;
      border-radius: 8px;
      background: #fff;
      color: #2d2a26;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      box-shadow: 2px 2px 0 #2d2a26;
      transition: all 0.12s;
      white-space: nowrap;
    }
    .chip-btn:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #2d2a26; }
    .chip-btn:active { transform: translate(1px,1px); box-shadow: 1px 1px 0 #2d2a26; }
    .chip-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: 2px 2px 0 #2d2a26; }
    .chip-btn.accent { background: #ffdd77; }
    .chip-btn.lg { padding: 0.75rem 1.5rem; font-size: 1rem; }

    /* ─── Stats ─── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      display: flex; gap: 1rem; align-items: flex-start;
      padding: 1.25rem;
      border: 2px solid #2d2a26;
      border-radius: 14px;
      box-shadow: 4px 4px 0 #2d2a26;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .stat-card:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 #2d2a26; }
    .stat-card.blue  { background: #d3eaff; }
    .stat-card.yellow { background: #fff5cb; }
    .stat-card.green  { background: #d4f5e0; }
    .stat-icon { font-size: 1.8rem; }
    .stat-label { margin: 0; font-size: 0.78rem; color: #5a5347; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .stat-value { font-family: 'Space Mono', monospace; font-size: 2rem; font-weight: 700; color: #2d2a26; margin: 0.2rem 0; }
    .stat-value span { font-size: 0.9rem; font-weight: 400; color: #7a6f5f; }
    .stat-note { margin: 0; font-size: 0.75rem; color: #7a6f5f; }

    /* ─── Action Row ─── */
    .action-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
    .action-btn {
      flex: 1; min-width: 180px;
      padding: 0.85rem 1.5rem;
      border: 2px solid #2d2a26;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 4px 4px 0 #2d2a26;
      transition: all 0.15s;
    }
    .action-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 #2d2a26; }
    .action-btn:active { transform: translate(2px,2px); box-shadow: 2px 2px 0 #2d2a26; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: 4px 4px 0 #2d2a26; }
    .action-btn.primary { background: #ffdd77; }
    .action-btn.secondary { background: #fff; }

    /* ─── History ─── */
    .section-title {
      font-family: 'Space Mono', monospace;
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px dashed #c5bdb0;
    }

    .skeleton-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .skeleton-item {
      height: 72px;
      border-radius: 12px;
      background: linear-gradient(90deg, #ede8e0 25%, #f5f1ea 50%, #ede8e0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border: 2px solid #d4cfc7;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .history-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .reading-card.retro {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: #fff;
      border: 2px solid #2d2a26;
      border-radius: 12px;
      box-shadow: 3px 3px 0 #2d2a26;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .reading-card.retro:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #2d2a26; }

    .reading-thumb {
      width: 52px; height: 52px;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #2d2a26;
      flex-shrink: 0;
    }
    .reading-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .placeholder-thumb {
      display: flex; align-items: center; justify-content: center;
      background: #fdf6ec;
      font-size: 1.4rem;
    }

    .reading-info { flex: 1; min-width: 0; }
    .reading-main { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.25rem; }

    .kw-badge {
      font-family: 'Space Mono', monospace;
      font-weight: 700;
      font-size: 1.05rem;
      color: #2d2a26;
    }
    .diff-badge {
      padding: 0.15rem 0.55rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: 'Space Mono', monospace;
      border: 1.5px solid;
    }
    .diff-badge.positive { background: #d4f5e0; color: #1a6637; border-color: #1a6637; }
    .diff-badge.zero     { background: #ebe8e2; color: #5a5347; border-color: #5a5347; }
    .diff-badge.negative { background: #ffd6d6; color: #a83232; border-color: #a83232; }

    .cost-badge {
      padding: 0.15rem 0.55rem;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 700;
      font-family: 'Space Mono', monospace;
      border: 1.5px dashed;
    }
    .cost-badge.positive { background: #fffbf0; color: #7a5f00; border-color: #c8a400; }
    .cost-badge.zero     { background: #ebe8e2; color: #5a5347; border-color: #5a5347; }
    .cost-badge.negative { background: #ffd6d6; color: #a83232; border-color: #a83232; }
    .first-badge {
      padding: 0.15rem 0.55rem;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 600;
      background: #fff5cb;
      color: #7a5f00;
      border: 1.5px solid #c8a400;
    }
    .reading-date { font-size: 0.78rem; color: #8a7f70; }

    .date-row { display: flex; align-items: center; gap: 0.4rem; }
    .edit-date-btn {
      background: none; border: none; cursor: pointer;
      font-size: 0.8rem; padding: 0.1rem 0.3rem;
      opacity: 0; transition: opacity 0.15s;
      border-radius: 4px;
    }
    .reading-card.retro:hover .edit-date-btn { opacity: 1; }
    .edit-date-btn:hover { background: #fff5cb; }

    .date-edit-row { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.2rem; }
    .date-input {
      font-size: 0.8rem;
      padding: 0.25rem 0.5rem;
      border: 2px solid #2d2a26;
      border-radius: 6px;
      background: #fdf6ec;
      color: #2d2a26;
      font-family: 'Inter', sans-serif;
    }
    .save-date-btn, .cancel-date-btn {
      font-size: 0.85rem;
      padding: 0.2rem 0.5rem;
      border: 2px solid #2d2a26;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 700;
      box-shadow: 2px 2px 0 #2d2a26;
      transition: all 0.1s;
    }
    .save-date-btn { background: #d4f5e0; color: #1a6637; }
    .save-date-btn:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #2d2a26; }
    .save-date-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .cancel-date-btn { background: #fff; color: #2d2a26; }
    .cancel-date-btn:hover { background: #ffe5e5; }

    .reading-card.editing { border-color: #ffaa33; box-shadow: 3px 3px 0 #ffaa33; background: #fffbf0; }

    .delete-btn {
      background: none;
      border: 2px solid transparent;
      color: #c9b8a8;
      font-size: 1rem;
      cursor: pointer;
      padding: 0.4rem;
      border-radius: 8px;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .delete-btn:hover { color: #c0392b; background: #ffe5e5; border-color: #c0392b; }

    /* ─── Empty Readings ─── */
    .empty-readings {
      display: flex; flex-direction: column; align-items: center;
      padding: 3rem 2rem;
      text-align: center;
      background: #fff;
      border: 2px dashed #c5bdb0;
      border-radius: 14px;
      gap: 0.75rem;
    }
    .empty-readings span { font-size: 3rem; }
    .empty-readings p { color: #8a7f70; margin: 0; }

    /* ─── Empty State Large ─── */
    .empty-state-large {
      display: flex; flex-direction: column; align-items: center;
      padding: 4rem 2rem;
      text-align: center;
      background: #fff;
      border: 2px dashed #c5bdb0;
      border-radius: 20px;
    }
    .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
    .empty-state-large h2 { font-family: 'Space Mono', monospace; font-size: 1.5rem; margin: 0 0 0.5rem; }
    .empty-state-large p { color: #7a6f5f; margin: 0 0 2rem; }
    .create-form { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 440px; }
    .create-form input {
      flex: 1; min-width: 200px;
      padding: 0.65rem 1rem;
      border: 2px solid #2d2a26;
      border-radius: 10px;
      background: #fdf6ec;
      font-size: 0.95rem;
    }

    /* ─── Projection Grid ─── */
    .projection-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .panel {
      background: #fff;
      border: 2px solid #2d2a26;
      border-radius: 16px;
      padding: 1.25rem 1.4rem;
      box-shadow: 4px 4px 0 #2d2a26;
    }
    .panel-title {
      font-family: 'Space Mono', monospace;
      font-size: 0.95rem;
      margin: 0 0 0.2rem;
      color: #2d2a26;
    }
    .panel-subtitle {
      font-size: 0.76rem;
      color: #7a6f5f;
      margin: 0 0 1rem;
    }

    /* ─── Tariff Table ─── */
    .tariff-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
      margin-bottom: 0.85rem;
    }
    .tariff-table th {
      text-align: left;
      font-family: 'Space Mono', monospace;
      font-size: 0.72rem;
      color: #7a6f5f;
      border-bottom: 2px solid #e8e2d8;
      padding: 0.3rem 0.5rem;
    }
    .tariff-table td {
      padding: 0.35rem 0.5rem;
      border-bottom: 1px solid #f0ece5;
    }
    .tariff-table tr.active-tier td {
      background: #fff5cb;
      font-weight: 600;
    }
    .tier-dot {
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #d0c9bc;
      margin-right: 4px;
      vertical-align: middle;
    }
    .tier-dot.active { background: #f59e0b; }
    .tier-rate { font-family: 'Space Mono', monospace; color: #2d2a26; }

    .tariff-note {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      padding: 0.28rem 0;
      border-top: 1px dashed #e8e2d8;
      color: #5a5347;
    }
    .tariff-note.subsidy { color: #1a6637; }
    .tariff-note.highlight {
      color: #2d2a26;
      font-size: 0.82rem;
      background: #d3eaff;
      border-radius: 6px;
      padding: 0.4rem 0.6rem;
      margin-top: 0.5rem;
      border: none;
    }

    /* ─── Projection Panel ─── */
    .tariff-panel { background: #fffbf0; }
    .projection-panel { background: #f0f8ff; }

    .proj-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.84rem;
      padding: 0.3rem 0;
      border-bottom: 1px solid rgba(45,42,38,0.07);
      color: #3d3830;
    }
    .proj-val { font-family: 'Space Mono', monospace; font-size: 0.82rem; color: #2d2a26; }
    .proj-val.accent { color: #c05c00; font-weight: 700; }
    .proj-val.green { color: #1a6637; font-weight: 700; }
    .proj-row.subsidy-row { color: #1a6637; }
    .proj-row.subsidy-info-row { color: #9a8f82; font-size: 0.78rem; font-style: italic; }
    .proj-val.subsidy-info-val { color: #9a8f82; font-size: 0.76rem; }
    .tariff-note.subsidy-info { color: #9a8f82; font-style: italic; }
    .proj-row.baseline-row { color: #8a8078; font-size: 0.78rem; border-bottom: 1px dashed #d0c9bc; }

    .proj-divider {
      border-top: 2px dashed #b8d4e8;
      margin: 0.75rem 0 0.5rem;
    }

    .proj-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
      background: #2d2a26;
      color: #fff5cb;
      border-radius: 10px;
      padding: 0.55rem 0.9rem;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .proj-total-val {
      font-family: 'Space Mono', monospace;
      font-size: 1.1rem;
      color: #ffdd77;
    }
    .proj-disclaimer {
      font-size: 0.7rem;
      color: #8a8078;
      margin: 0.6rem 0 0;
      font-style: italic;
    }

    /* ─── Responsive ─── */
    @media (max-width: 700px) {
      .projection-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .content { padding: 1rem; }
      .header { padding: 1rem; }
      .header h1 { font-size: 1.1rem; }
      .stat-value { font-size: 1.5rem; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class HomeComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  meters = signal<any[]>([]);
  selectedMeter = signal<any>(null);
  readings = signal<any[]>([]);
  tariffs = signal<any[]>([]);
  loading = signal(false);
  editingReadingId = signal<string | null>(null);
  editingDate = signal<string>('');
  savingDate = signal(false);
  saveDateError = signal<string>('');

  showNewMeterFormula = false;
  newMeterName = '';

  currentConsumption = computed(() => {
    const list = this.readings();
    if (list.length < 2) return list.length === 1 ? list[0].kw_value : 0;
    return Math.max(0, list[0].kw_value - list[1].kw_value);
  });

  // ─── Consumption SINCE billing period start (e.g. Feb 14) ───
  // Finds the baseline reading closest to/just before the billing start,
  // then subtracts from the most recent reading.
  consumptionSinceCutoff = computed(() => {
    const list = this.readings(); // sorted descending by reading_date
    if (list.length === 0) return 0;
    const periodStart = this.billingPeriodStart();

    // Most recent reading is the current value
    const latest = list[0];

    // Find the reading taken on or just before the billing period start
    // (sorted desc, so iterate to find last one that is <= periodStart)
    const baseline = list.find(r => new Date(r.reading_date) <= periodStart);

    if (!baseline) {
      // No reading before the cutoff — use all readings in current period
      // (oldest reading after cutoff as baseline)
      const oldest = list[list.length - 1];
      return Math.max(0, parseFloat((latest.kw_value - oldest.kw_value).toFixed(2)));
    }

    return Math.max(0, parseFloat((latest.kw_value - baseline.kw_value).toFixed(2)));
  });

  baselineReading = computed(() => {
    const list = this.readings();
    if (list.length === 0) return null;
    const periodStart = this.billingPeriodStart();
    return list.find(r => new Date(r.reading_date) <= periodStart) ?? list[list.length - 1];
  });

  // ─── Tariff: tiered calculation per ARCONEL BTCRSD01 ───
  energyCost = computed(() => {
    return this.calcTieredCost(this.consumptionSinceCutoff());
  });

  // kept for backwards compat with cost badges in reading list
  estimatedCost = computed(() => this.energyCost());

  // ─── Billing cycle ───
  billingCutoffDate = computed(() => {
    const meter = this.selectedMeter();
    if (!meter) return new Date();
    const day = meter.billing_day ?? 14;
    const now = new Date();
    let cutoff = new Date(now.getFullYear(), now.getMonth(), day);
    if (cutoff <= now) {
      cutoff = new Date(now.getFullYear(), now.getMonth() + 1, day);
    }
    return cutoff;
  });

  billingPeriodStart = computed(() => {
    const cutoff = this.billingCutoffDate();
    const meter = this.selectedMeter();
    if (!meter) return new Date();
    const day = meter.billing_day ?? 14;
    return new Date(cutoff.getFullYear(), cutoff.getMonth() - 1, day);
  });

  daysUntilCutoff = computed(() => {
    const diff = this.billingCutoffDate().getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  });

  daysElapsed = computed(() => {
    const start = this.billingPeriodStart();
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });

  totalBillingDays = computed(() => {
    const start = this.billingPeriodStart();
    const end = this.billingCutoffDate();
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  });

  // ─── Projection (based on actual since-cutoff consumption) ───
  projectedKwh = computed(() => {
    const elapsed = this.daysElapsed();
    const total = this.totalBillingDays();
    if (elapsed <= 0) return 0;
    const dailyRate = this.consumptionSinceCutoff() / elapsed;
    return parseFloat((dailyRate * total).toFixed(1));
  });

  projectedEnergyCost = computed(() => {
    return this.calcTieredCost(this.projectedKwh());
  });

  projectedTotalBill = computed(() => {
    const meter = this.selectedMeter();
    if (!meter) return this.projectedEnergyCost();
    // The subsidy (Subsidio Tarifa Eléctrica) in Ecuador is NOT deducted from the bill.
    // The low tariff rates already ARE the subsidized rates.
    // The subsidy shown on the CNEL bill is informational (government pays CNEL directly).
    const comercializacion = parseFloat(meter.fixed_charge_comercializacion ?? 1.41);
    const alumbrado = parseFloat(meter.fixed_charge_alumbrado ?? 2.38);
    return this.projectedEnergyCost() + comercializacion + alumbrado;
  });

  activeTierLabel = computed(() => {
    const kw = this.consumptionSinceCutoff();
    const trf = this.tariffs();
    if (!trf || trf.length === 0) return '?';
    let label = '1';
    let idx = 1;
    for (const t of trf) {
      if (kw >= t.range_min && (t.range_max === null || kw <= t.range_max)) {
        label = String(idx);
      }
      idx++;
    }
    return label;
  });


  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    try {
      const resTariffs = await this.supabase.getTariffRanges();
      if (resTariffs.data) this.tariffs.set(resTariffs.data);

      const { data: mData } = await this.supabase.getMeters();
      if (mData) {
        this.meters.set(mData);
        if (mData.length > 0) {
          this.selectedMeter.set(mData[0]);
          await this.loadReadings(mData[0].id);
        }
      }
    } finally {
      this.loading.set(false);
    }
  }

  selectMeter(id: string) {
    const m = this.meters().find(x => x.id === id);
    if (m) {
      this.selectedMeter.set(m);
      this.loadReadings(m.id);
    }
  }

  async loadReadings(meterId: string) {
    this.loading.set(true);
    try {
      const { data } = await this.supabase.getReadings(meterId);
      if (data) this.readings.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  async recalculate() {
    if (this.selectedMeter()) {
      await this.loadReadings(this.selectedMeter().id);
    }
  }

  async createMeter() {
    if (!this.newMeterName) return;
    const { error } = await this.supabase.createMeter(this.newMeterName, 13);
    if (!error) {
      this.newMeterName = '';
      this.showNewMeterFormula = false;
      this.loadData();
    }
  }

  async deleteReading(id: string) {
    const confirmed = window.confirm('¿Eliminar esta lectura? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    const { error } = await this.supabase.deleteReading(id);
    if (!error && this.selectedMeter()) {
      await this.loadReadings(this.selectedMeter().id);
    }
  }

  startEditDate(reading: any) {
    // Convert ISO date to datetime-local format (YYYY-MM-DDTHH:mm)
    const d = new Date(reading.reading_date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    this.editingDate.set(d.toISOString().slice(0, 16));
    this.editingReadingId.set(reading.id);
  }

  async saveReadingDate(id: string) {
    if (!this.editingDate()) return;
    this.savingDate.set(true);
    this.saveDateError.set('');
    try {
      const isoDate = new Date(this.editingDate()).toISOString();
      const { error } = await this.supabase.updateReadingDate(id, isoDate);
      if (error) {
        console.error('Error updating reading date:', error);
        this.saveDateError.set('Error al guardar: ' + error.message);
        return;
      }
      this.cancelEditDate();
      // Reload from DB to get correct order by reading_date
      if (this.selectedMeter()) {
        await this.loadReadings(this.selectedMeter().id);
      }
    } catch(e: any) {
      console.error('Unexpected error saving date:', e);
      this.saveDateError.set('Error inesperado al guardar.');
    } finally {
      this.savingDate.set(false);
    }
  }

  cancelEditDate() {
    this.editingReadingId.set(null);
    this.editingDate.set('');
    this.saveDateError.set('');
  }

  // ─── Tiered tariff engine (ARCONEL BTCRSD01) ───
  calcTieredCost(kw: number): number {
    if (kw <= 0) return 0;
    const trf = this.tariffs();
    if (!trf || trf.length === 0) return 0;
    let cost = 0;
    let remaining = kw;
    for (const tier of trf) {
      if (remaining <= 0) break;
      const tierMax = tier.range_max !== null ? tier.range_max : Infinity;
      const tierSize = Math.max(0, tierMax - tier.range_min + 1);
      const inThisTier = Math.min(remaining, tierSize);
      cost += inThisTier * parseFloat(tier.rate);
      remaining -= inThisTier;
    }
    return parseFloat(cost.toFixed(2));
  }

  isActiveTier(tier: any): boolean {
    const kw = this.consumptionSinceCutoff(); // must use period total, not last-2-reading delta
    return kw >= tier.range_min && (tier.range_max === null || kw <= tier.range_max);
  }

  // Returns delta kWh between reading at index i and the next one (i+1, which is older)
  getConsumptionDelta(i: number): number {
    const list = this.readings();
    if (i + 1 >= list.length) return 0;
    return parseFloat((list[i].kw_value - list[i + 1].kw_value).toFixed(2));
  }

  // Calculates cost for a given kWh delta using tariff ranges
  getConsumptionCost(deltaKw: number): number {
    const kw = Math.abs(deltaKw);
    if (kw === 0) return 0;
    const trf = this.tariffs();
    if (!trf || trf.length === 0) return 0;
    let applicableRate = trf[0].rate;
    for (const range of trf) {
      if (kw >= range.range_min && (range.range_max === null || kw <= range.range_max)) {
        applicableRate = range.rate;
      }
    }
    return parseFloat((kw * applicableRate).toFixed(2));
  }

  goToNewReading() {
    if (this.selectedMeter()) {
      this.router.navigate(['/new-reading'], { queryParams: { meterId: this.selectedMeter().id } });
    }
  }

  getPublicUrl(path: string) {
    return this.supabase['supabase'].storage.from('meter_images').getPublicUrl(path).data.publicUrl;
  }

  logout() {
    this.supabase.signOut();
  }
}
