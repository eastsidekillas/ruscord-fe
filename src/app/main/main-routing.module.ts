import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from "./components/home/home.component";
import { FriendsComponent } from "./components/friends/friends.component";
import {ChatComponent} from "./components/chat/chat.component";

const routes: Routes = [
  {
    path: 'me',
    component: HomeComponent,
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
