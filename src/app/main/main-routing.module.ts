import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FriendsComponent } from "./pages/friends/friends.component";
import {ChatComponent} from "./pages/chat/chat.component";
import {AuthGuard} from "../auth/guards/auth.guard";
import {DarkLayoutComponent} from "../shared/layouts/dark-layout/dark-layout.component";

const routes: Routes = [
  {
    path: 'me',
    component: DarkLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: FriendsComponent },
      { path: ':uuid', component: ChatComponent },
    ],
  },
  { path: '', redirectTo: 'me', pathMatch: 'full' },  // Перенаправление на /me (главную страницу)
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainRoutingModule { }
