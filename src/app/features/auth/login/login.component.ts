import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>Lectura de Medidores ⚡️</h1>
        <p>Inicia sesión mediante tu correo electrónico</p>
        
        <form (ngSubmit)="handleLogin()">
          <input 
            type="email" 
            [(ngModel)]="email" 
            name="email"
            placeholder="tu@correo.com"
            required
            [disabled]="loading()">
            
          <button type="submit" [disabled]="loading() || !email()">
            {{ loading() ? 'Enviando enlace...' : 'Enviar enlace mágico' }}
          </button>
        </form>

        <div *ngIf="message()" class="status-msg">
          {{ message() }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; background-color: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
    .login-card { background: #1e293b; padding: 2.5rem 2rem; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); text-align: center; max-width: 360px; width: 100%; border: 1px solid #334155; }
    h1 { margin-bottom: 0.5rem; color: #f8fafc; font-size: 1.5rem; font-weight: 600; }
    p { color: #94a3b8; margin-bottom: 2rem; font-size: 0.95rem; }
    input { box-sizing: border-box; width: 100%; padding: 12px 14px; margin-bottom: 1rem; border: 1px solid #475569; background: #0f172a; color: white; border-radius: 8px; font-size: 1rem; outline: none; transition: border-color 0.2s; }
    input:focus { border-color: #3b82f6; }
    button { width: 100%; padding: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background 0.2s, transform 0.1s; }
    button:active { transform: scale(0.98); }
    button:hover { background-color: #2563eb; }
    button:disabled { background-color: #475569; color: #94a3b8; cursor: not-allowed; transform: none; }
    .status-msg { margin-top: 1.5rem; padding: 1rem; background-color: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; font-size: 0.9rem; }
  `]
})
export class LoginComponent {
  private supabase = inject(SupabaseService);
  
  email = signal('');
  loading = signal(false);
  message = signal('');

  async handleLogin() {
    try {
      this.loading.set(true);
      const { error } = await this.supabase.signInWithEmail(this.email());
      if (error) throw error;
      this.message.set('¡Revisa tu bandeja de entrada! Hemos enviado un enlace de inicio de sesión.');
    } catch (error: any) {
      this.message.set(error.error_description || error.message);
    } finally {
      this.loading.set(false);
    }
  }
}
