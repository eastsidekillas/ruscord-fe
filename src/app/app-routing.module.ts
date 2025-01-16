import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {AuthGuard} from "./auth/guards/auth.guard";

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule),
  },
  {
    path: 'channels',
    canActivate: [AuthGuard],
    loadChildren: () => import('./main/main.module').then(m => m.MainModule),
  },
  // Переадресация на главную страницу
  { path: '', redirectTo: 'channels/me', pathMatch: 'full'  }, // Главная страница будет перенаправлять на /channels/me
  { path: '**', redirectTo: 'channels/me' }, // Редирект для несуществующих путей
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
