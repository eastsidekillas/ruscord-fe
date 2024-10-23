import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {ProfileComponent} from "./main/profile/profile.component";
import {HomeComponent} from "./main/home/home.component";
import {FriendsComponent} from "./main/friends/friends.component";

const routes: Routes = [

  { path: '', component: HomeComponent, children: [

    { path: 'direct-messages', loadChildren: () => import('./pages/pages.module').then(m => m.PagesModule) },

    ] },



  { path: 'profile', component: ProfileComponent },
  { path: 'friends', component: FriendsComponent },


  { path: 'auth', loadChildren: () => import('./utils/auth/auth.module').then(m => m.AuthModule) },
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
