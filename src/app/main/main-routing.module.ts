import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {HomeComponent} from "./components/home/home.component";
import {DirectMessageComponent} from "./components/direct-mesage/direct-message.component";
import {FriendsComponent} from "./components/friends/friends.component";
import {ProfileComponent} from "../shared/components/profile/profile.component";


const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    children: [
      { path: 'chat', component: DirectMessageComponent },
      { path: 'friends', component: FriendsComponent },
      { path: 'profile', component: ProfileComponent },

    ],
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainRoutingModule { }
