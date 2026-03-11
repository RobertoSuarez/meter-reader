import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">

      <!-- Decorative background dots -->
      <div class="bg-dots"></div>

      <div class="login-wrapper">

        <!-- Left panel: branding -->
        <div class="brand-panel">
          <div class="brand-logo">⚡</div>
          <h2 class="brand-name">Lecturas<br>de Luz</h2>
          <p class="brand-tagline">Control inteligente de tu consumo eléctrico</p>

          <div class="brand-features">
            <div class="feature-item">
              <span class="feature-icon">📊</span>
              <span>Proyección de planilla CNEL</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">⚡</span>
              <span>Tarifas ARCONEL actualizadas</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📸</span>
              <span>Lectura por foto del medidor</span>
            </div>
          </div>
        </div>

        <!-- Right panel: form -->
        <div class="form-panel">
          <div class="form-card">

            <div class="form-header">
              <div class="form-icon">🔑</div>
              <h1 class="form-title">Iniciar sesión</h1>
              <p class="form-subtitle">Ingresa tu correo y te enviamos un enlace mágico</p>
            </div>

            <form (ngSubmit)="handleLogin()" *ngIf="!sent()">
              <div class="input-group">
                <label for="email-input">Correo electrónico</label>
                <div class="input-wrapper">
                  <span class="input-icon">✉️</span>
                  <input
                    id="email-input"
                    type="email"
                    [(ngModel)]="email"
                    name="email"
                    placeholder="tu@correo.com"
                    required
                    [disabled]="loading()"
                    autocomplete="email">
                </div>
              </div>

              <button type="submit" class="submit-btn" [disabled]="loading() || !email()">
                <span *ngIf="!loading()">✨ Enviar enlace mágico</span>
                <span *ngIf="loading()" class="loading-text">
                  <span class="spinner"></span> Enviando...
                </span>
              </button>

              <div *ngIf="errorMsg()" class="error-msg">
                ⚠️ {{ errorMsg() }}
              </div>
            </form>

            <!-- Success state -->
            <div *ngIf="sent()" class="success-state">
              <div class="success-icon">📬</div>
              <h3>¡Revisa tu correo!</h3>
              <p>Hemos enviado un enlace de acceso a<br><strong>{{ email }}</strong></p>
              <p class="success-note">El enlace expira en 10 minutos. Si no lo ves, revisa la carpeta de spam.</p>
              <button class="retry-btn" (click)="reset()">↩ Cambiar correo</button>
            </div>

            <div class="form-footer">
              <span class="footer-badge">🇪🇨 Ecuador · CNEL Guayas Los Ríos</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .login-page {
      min-height: 100vh;
      background: #fdf6ec;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', system-ui, sans-serif;
      position: relative;
      overflow: hidden;
      padding: 1rem;
    }

    /* Decorative dot grid background */
    .bg-dots {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(#d4c9b8 1.5px, transparent 1.5px);
      background-size: 28px 28px;
      opacity: 0.45;
      pointer-events: none;
    }

    /* ─── Wrapper ─── */
    .login-wrapper {
      display: grid;
      grid-template-columns: 1fr 1fr;
      max-width: 860px;
      width: 100%;
      border: 3px solid #2d2a26;
      border-radius: 24px;
      box-shadow: 8px 8px 0 #2d2a26;
      overflow: hidden;
      position: relative;
      z-index: 1;
    }

    /* ─── Brand Panel ─── */
    .brand-panel {
      background: #2d2a26;
      padding: 3rem 2.5rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.5rem;
    }

    .brand-logo {
      width: 64px; height: 64px;
      background: #ffdd77;
      border: 3px solid #ffdd77;
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      font-size: 2rem;
      box-shadow: 4px 4px 0 rgba(255,221,119,0.3);
    }

    .brand-name {
      font-family: 'Space Mono', monospace;
      font-size: 2rem;
      color: #fff5cb;
      line-height: 1.15;
    }

    .brand-tagline {
      color: #a89f90;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .brand-features {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      margin-top: 0.5rem;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #d0c9bc;
      font-size: 0.85rem;
    }

    .feature-icon {
      font-size: 1rem;
      width: 28px; height: 28px;
      background: rgba(255,221,119,0.12);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    /* ─── Form Panel ─── */
    .form-panel {
      background: #fff9f0;
      padding: 3rem 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .form-card {
      width: 100%;
      max-width: 340px;
    }

    .form-header {
      margin-bottom: 2rem;
    }

    .form-icon {
      font-size: 2rem;
      margin-bottom: 0.75rem;
      display: inline-block;
      animation: wiggle 3s ease-in-out infinite;
    }

    @keyframes wiggle {
      0%, 100% { transform: rotate(-5deg); }
      50% { transform: rotate(5deg); }
    }

    .form-title {
      font-family: 'Space Mono', monospace;
      font-size: 1.5rem;
      color: #2d2a26;
      margin-bottom: 0.4rem;
    }

    .form-subtitle {
      color: #7a6f5f;
      font-size: 0.87rem;
      line-height: 1.5;
    }

    /* ─── Input ─── */
    .input-group {
      margin-bottom: 1.25rem;
    }

    .input-group label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: #3d3830;
      margin-bottom: 0.45rem;
      font-family: 'Space Mono', monospace;
    }

    .input-wrapper {
      display: flex;
      align-items: center;
      border: 2.5px solid #2d2a26;
      border-radius: 12px;
      background: #fdf6ec;
      box-shadow: 3px 3px 0 #2d2a26;
      overflow: hidden;
      transition: box-shadow 0.15s;
    }

    .input-wrapper:focus-within {
      box-shadow: 4px 4px 0 #c08000;
      border-color: #c08000;
    }

    .input-icon {
      padding: 0 0.75rem;
      font-size: 1rem;
      flex-shrink: 0;
    }

    input {
      flex: 1;
      padding: 0.75rem 0.75rem 0.75rem 0;
      border: none;
      background: transparent;
      color: #2d2a26;
      font-size: 0.97rem;
      font-family: 'Inter', sans-serif;
      outline: none;
    }

    input::placeholder { color: #b0a898; }
    input:disabled { opacity: 0.6; }

    /* ─── Button ─── */
    .submit-btn {
      width: 100%;
      padding: 0.85rem 1rem;
      background: #ffdd77;
      color: #2d2a26;
      border: 2.5px solid #2d2a26;
      border-radius: 12px;
      font-size: 0.97rem;
      font-weight: 700;
      font-family: 'Space Mono', monospace;
      cursor: pointer;
      box-shadow: 4px 4px 0 #2d2a26;
      transition: all 0.15s;
      letter-spacing: 0.01em;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0 #2d2a26;
      background: #ffd044;
    }

    .submit-btn:active:not(:disabled) {
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0 #2d2a26;
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: 4px 4px 0 #2d2a26;
    }

    /* ─── Spinner ─── */
    .loading-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
    }

    .spinner {
      display: inline-block;
      width: 16px; height: 16px;
      border: 3px solid rgba(45,42,38,0.3);
      border-top-color: #2d2a26;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ─── Error ─── */
    .error-msg {
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background: #ffe5e5;
      border: 2px solid #f87171;
      border-radius: 10px;
      color: #b91c1c;
      font-size: 0.85rem;
      box-shadow: 2px 2px 0 #f87171;
    }

    /* ─── Success ─── */
    .success-state {
      text-align: center;
      padding: 1rem 0;
    }

    .success-icon {
      font-size: 3.5rem;
      margin-bottom: 1rem;
      animation: bounce 1s ease infinite alternate;
    }

    @keyframes bounce {
      from { transform: translateY(0); }
      to { transform: translateY(-8px); }
    }

    .success-state h3 {
      font-family: 'Space Mono', monospace;
      font-size: 1.2rem;
      color: #2d2a26;
      margin-bottom: 0.6rem;
    }

    .success-state p {
      color: #5a5347;
      font-size: 0.88rem;
      line-height: 1.6;
      margin-bottom: 0.5rem;
    }

    .success-note {
      color: #9a8f82 !important;
      font-size: 0.78rem !important;
      margin-top: 0.75rem !important;
    }

    .retry-btn {
      margin-top: 1.25rem;
      padding: 0.55rem 1.25rem;
      background: #fff;
      border: 2px solid #2d2a26;
      border-radius: 10px;
      font-size: 0.87rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 2px 2px 0 #2d2a26;
      transition: all 0.15s;
      color: #2d2a26;
    }

    .retry-btn:hover {
      transform: translate(-1px, -1px);
      box-shadow: 3px 3px 0 #2d2a26;
    }

    /* ─── Footer ─── */
    .form-footer {
      margin-top: 2rem;
      text-align: center;
    }

    .footer-badge {
      font-size: 0.73rem;
      color: #a89f90;
      background: #f0e8d8;
      border: 1px solid #d8cfc0;
      border-radius: 20px;
      padding: 0.3rem 0.85rem;
      font-family: 'Space Mono', monospace;
    }

    /* ─── Responsive ─── */
    @media (max-width: 640px) {
      .login-wrapper {
        grid-template-columns: 1fr;
        border-radius: 20px;
      }
      .brand-panel { padding: 2rem 1.75rem; }
      .brand-name { font-size: 1.5rem; }
      .form-panel { padding: 2rem 1.75rem; }
    }
  `]
})
export class LoginComponent {
  private supabase = inject(SupabaseService);

  email = '';
  loading = signal(false);
  sent = signal(false);
  errorMsg = signal('');

  async handleLogin() {
    if (!this.email) return;
    try {
      this.loading.set(true);
      this.errorMsg.set('');
      const { error } = await this.supabase.signInWithEmail(this.email);
      if (error) throw error;
      this.sent.set(true);
    } catch (error: any) {
      this.errorMsg.set(error.error_description || error.message || 'Error al enviar el enlace');
    } finally {
      this.loading.set(false);
    }
  }

  reset() {
    this.sent.set(false);
    this.email = '';
    this.errorMsg.set('');
  }
}
