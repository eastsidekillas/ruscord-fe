
import {CommonModule} from "@angular/common";
import { NgModule } from '@angular/core';
import {FriendsComponent} from "./components/friends/friends.component";
import {HomeComponent} from "./components/home/home.component";
import {RouterOutlet} from "@angular/router";
import {SharedModule} from "../shared/shared.module";
import {FormsModule} from "@angular/forms";
import {MainRoutingModule} from "./main-routing.module";
import { ChatComponent } from './components/chat/chat.component';
import { ChatHeaderComponent } from './components/chat-header/chat-header.component';




@NgModule({
  declarations: [
    HomeComponent,
    FriendsComponent,
    ChatComponent,
    ChatHeaderComponent,
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
