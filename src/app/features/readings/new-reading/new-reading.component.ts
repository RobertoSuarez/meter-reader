import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-new-reading',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <header class="header">
        <button class="back-btn" (click)="goBack()">← Volver</button>
        <h1>Nueva Lectura</h1>
      </header>

      <main class="content">
        <div class="reading-card">
          <p class="instructions">📡 Sube una foto de tu medidor. La IA extraerá el valor automáticamente.</p>

          <!-- Upload Area -->
          <div class="upload-area" (click)="fileInput.click()" [class.has-image]="previewUrl()">
            <input #fileInput type="file" accept="image/*" capture="environment"
              (change)="onFileSelected($event)" style="display: none;">
            <div *ngIf="!previewUrl()" class="placeholder">
              <span>📸</span>
              <p>Toca para tomar o subir foto</p>
            </div>
            <img *ngIf="previewUrl()" [src]="previewUrl()" class="preview-image" alt="Preview">
          </div>

          <!-- AI Progress Bar -->
          <div class="progress-wrap" *ngIf="scanning()">
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
            <p class="progress-label">✨ Analizando imagen con IA...</p>
          </div>

          <!-- Action Buttons -->
          <div class="actions-row">
            <button class="retro-btn outline" (click)="fileInput.click()">🔄 Cambiar foto</button>
            <button class="retro-btn accent" [disabled]="!selectedFile() || scanning()" (click)="scanWithAI()">
              {{ scanning() ? 'Analizando...' : '✨ Extraer con IA' }}
            </button>
          </div>

          <!-- Error -->
          <div *ngIf="aiError()" class="error-msg">⚠️ {{ aiError() }}</div>

          <!-- Form -->
          <form class="manual-form" (ngSubmit)="saveReading()">
            <div class="form-group">
              <label>Lectura (kWh)</label>
              <input type="number" [(ngModel)]="kwValue" name="kwValue" class="large-input"
                placeholder="Ej. 5406" required>
            </div>
            <div class="form-group">
              <label>Fecha de Lectura</label>
              <input type="datetime-local" [(ngModel)]="readingDate" name="readingDate" required>
            </div>
            <button type="submit" class="retro-btn primary full-width" [disabled]="saving() || !kwValue()">
              {{ saving() ? '⏳ Guardando...' : '💾 Guardar Lectura' }}
            </button>
          </form>
        </div>
      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap');

    * { box-sizing: border-box; }
    .page-container {
      min-height: 100vh;
      background: #fdf6ec;
      color: #2d2a26;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* ─── Header ─── */
    .header {
      display: flex; align-items: center; gap: 1rem;
      padding: 1.25rem 2rem;
      background: #fff5d6;
      border-bottom: 3px solid #2d2a26;
    }
    .header h1 {
      margin: 0;
      font-family: 'Space Mono', monospace;
      font-size: 1.2rem;
    }
    .back-btn {
      background: #fff;
      border: 2px solid #2d2a26;
      padding: 0.4rem 0.9rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 2px 2px 0 #2d2a26;
      transition: all 0.12s;
    }
    .back-btn:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #2d2a26; }
    .back-btn:active { transform: translate(1px,1px); box-shadow: 1px 1px 0 #2d2a26; }

    /* ─── Content ─── */
    .content { padding: 2rem; max-width: 580px; margin: 0 auto; }
    .reading-card {
      background: #fff;
      border: 2px solid #2d2a26;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 5px 5px 0 #2d2a26;
    }
    .instructions {
      text-align: center;
      color: #7a6f5f;
      margin: 0 0 1.5rem;
      font-size: 0.95rem;
    }

    /* ─── Upload Area ─── */
    .upload-area {
      border: 2.5px dashed #c5bdb0;
      border-radius: 14px;
      min-height: 200px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      overflow: hidden;
      margin-bottom: 1.25rem;
      background: #fdf6ec;
      transition: border-color 0.2s, background 0.2s;
    }
    .upload-area:hover { border-color: #ffaa33; background: #fffbf0; }
    .upload-area.has-image { border-style: solid; border-color: #2d2a26; background: #000; }
    .placeholder { text-align: center; color: #a09080; }
    .placeholder span { font-size: 3.5rem; display: block; margin-bottom: 0.5rem; }
    .placeholder p { margin: 0; font-size: 0.9rem; }
    .preview-image { width: 100%; max-height: 320px; object-fit: contain; }

    /* ─── Progress ─── */
    .progress-wrap { margin-bottom: 1.25rem; text-align: center; }
    .progress-bar {
      height: 8px;
      background: #ede8e0;
      border-radius: 99px;
      border: 1.5px solid #2d2a26;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }
    .progress-fill {
      width: 60%;
      height: 100%;
      background: #ffdd77;
      border-radius: 99px;
      animation: progress-slide 1.5s ease-in-out infinite;
    }
    @keyframes progress-slide {
      0%   { margin-left: -60%; }
      100% { margin-left: 100%; }
    }
    .progress-label { font-size: 0.85rem; color: #7a6f5f; margin: 0; }

    /* ─── Actions ─── */
    .actions-row { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; }
    .actions-row button { flex: 1; }

    /* ─── Retro Buttons ─── */
    .retro-btn {
      padding: 0.75rem 1.25rem;
      border: 2px solid #2d2a26;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      font-family: 'Inter', sans-serif;
      box-shadow: 3px 3px 0 #2d2a26;
      transition: all 0.12s;
    }
    .retro-btn.outline { background: #fff; color: #2d2a26; }
    .retro-btn.accent  { background: #ffdd77; color: #2d2a26; }
    .retro-btn.primary { background: #d3eaff; color: #2d2a26; }
    .retro-btn:hover   { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #2d2a26; }
    .retro-btn:active  { transform: translate(1px,1px); box-shadow: 1px 1px 0 #2d2a26; }
    .retro-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: 3px 3px 0 #2d2a26; }
    .retro-btn.full-width { display: block; width: 100%; font-size: 1.05rem; padding: 1rem; margin-top: 1.5rem; }

    /* ─── Error ─── */
    .error-msg {
      background: #ffe8e8;
      border: 2px solid #e05252;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
      font-size: 0.9rem;
      color: #b52c2c;
    }

    /* ─── Form ─── */
    .form-group { margin-bottom: 1.25rem; }
    .form-group label {
      display: block;
      margin-bottom: 0.45rem;
      font-weight: 600;
      font-size: 0.85rem;
      color: #5a5347;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .form-group input {
      width: 100%; padding: 0.7rem 1rem;
      border: 2px solid #2d2a26;
      border-radius: 10px;
      background: #fdf6ec;
      color: #2d2a26;
      font-size: 1rem;
      font-family: 'Inter', sans-serif;
      transition: box-shadow 0.15s;
    }
    .form-group input:focus { outline: none; box-shadow: 3px 3px 0 #2d2a26; }
    .form-group input.large-input {
      font-family: 'Space Mono', monospace;
      font-size: 1.6rem;
      font-weight: 700;
      text-align: center;
      padding: 1rem;
    }

    /* ─── Responsive ─── */
    @media (max-width: 600px) {
      .content { padding: 1rem; }
      .reading-card { padding: 1.25rem; }
      .actions-row { flex-direction: column; }
    }
  `]
})
export class NewReadingComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  meterId = '';
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

  scanning = signal(false);
  saving = signal(false);
  aiError = signal('');

  kwValue = signal<number | null>(null);
  readingDate = signal<string>('');

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.meterId = params['meterId'];
      if (!this.meterId) this.router.navigate(['/dashboard']);
    });

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    this.readingDate.set(now.toISOString().slice(0, 16));
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      const reader = new FileReader();
      reader.onload = e => this.previewUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
      this.aiError.set('');
    }
  }

  async scanWithAI() {
    if (!this.selectedFile()) return;
    this.scanning.set(true);
    this.aiError.set('');
    try {
      const { data, error } = await this.supabase.uploadMeterImage(this.selectedFile()!);
      if (error) throw error;
      const result = await this.supabase.extractMeterReading(data.path);
      if (result && result.reading) {
        this.kwValue.set(parseFloat(result.reading));
      } else {
        throw new Error('No se pudo extraer la lectura.');
      }
    } catch (e: any) {
      this.aiError.set('Error IA: ' + (e.message || 'Error desconocido'));
    } finally {
      this.scanning.set(false);
    }
  }

  async saveReading() {
    if (!this.kwValue() || !this.meterId) return;
    this.saving.set(true);
    try {
      let imagePath = null;
      if (this.selectedFile() && this.previewUrl()) {
        const { data } = await this.supabase.uploadMeterImage(this.selectedFile()!);
        if (data) imagePath = data.path;
      }
      const isoDate = new Date(this.readingDate()).toISOString();
      await this.supabase.saveReading(this.meterId, this.kwValue()!, isoDate, imagePath!);
      this.router.navigate(['/dashboard']);
    } catch (e) {
      this.aiError.set('Error guardando lectura, intenta de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
