import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { HomeComponent } from './features/dashboard/home/home.component';
import { NewReadingComponent } from './features/readings/new-reading/new-reading.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: HomeComponent },
  { path: 'new-reading', component: NewReadingComponent },
  { path: '**', redirectTo: 'dashboard' } // Manejado por guard / app.component
];
