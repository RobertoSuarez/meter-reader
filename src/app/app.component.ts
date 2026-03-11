import { Component, effect, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { SupabaseService } from './core/services/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'meter-reader';
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      const user = this.supabase.currentUser();
      // Pequeño retardo para no interferir con la navegación inicial de Angular
      setTimeout(() => {
        if (user !== undefined) {
          if (user) {
            if (this.router.url.includes('/login') || this.router.url === '/') {
              this.router.navigate(['/dashboard']);
            }
          } else {
            // Verificar si estamos regresando de un magic link (token en la URL)
            const isSuccessCallback = typeof window !== 'undefined' && 
              (window.location.hash.includes('access_token') || window.location.search.includes('code'));
            const isErrorCallback = typeof window !== 'undefined' && 
              window.location.hash.includes('error_description');
            
            if (isErrorCallback) {
              // Hubo un error al validar el token (ej. expiró)
              this.router.navigate(['/login']);
            } else if (!isSuccessCallback && !this.router.url.includes('/login')) {
              this.router.navigate(['/login']);
            }
          }
        }
      });
    });
  }
}
