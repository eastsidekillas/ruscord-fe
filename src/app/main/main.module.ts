
import {CommonModule} from "@angular/common";
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {DirectMessageComponent} from "./components/direct-mesage/direct-message.component";
import {FriendsComponent} from "./components/friends/friends.component";
import {HomeComponent} from "./components/home/home.component";
import {RouterOutlet} from "@angular/router";
import {SharedModule} from "../shared/shared.module";
import {FormsModule} from "@angular/forms";
import {AppRoutingModule} from "../app-routing.module";
import {MainRoutingModule} from "./main-routing.module";




@NgModule({
  declarations: [
    HomeComponent,
    DirectMessageComponent,
    FriendsComponent,
  ],
  imports: [
    CommonModule,
    RouterOutlet,
    MainRoutingModule,
    SharedModule,
    FormsModule,

  ],
})
export class MainModule { }
