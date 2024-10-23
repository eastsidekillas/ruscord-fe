import { NgModule } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { ProfileComponent} from "./profile/profile.component";
import { FriendsComponent } from "./friends/friends.component";
import {FormsModule} from "@angular/forms";
import { HomeComponent } from './home/home.component';
import {RouterLink, RouterOutlet} from "@angular/router";
import {ComponentsModule} from "../components/components.module";


@NgModule({
  declarations: [
  ProfileComponent,
  FriendsComponent,
  HomeComponent,

  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ComponentsModule,
    RouterOutlet,
  ],
})
export class MainModule { }
