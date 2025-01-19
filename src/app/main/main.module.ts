
import {CommonModule} from "@angular/common";
import { NgModule } from '@angular/core';
import {FriendsComponent} from "./pages/friends/friends.component";
import {RouterOutlet} from "@angular/router";
import {SharedModule} from "../shared/shared.module";
import {FormsModule} from "@angular/forms";
import {MainRoutingModule} from "./main-routing.module";
import { ChatComponent } from './pages/chat/chat.component';
import { HeaderComponent } from './components/header/header.component';
import {PendingFriendRequestsComponent} from "./components/pending-friend-requests/pending-friend-requests.component";
import {PickerComponent} from "@ctrl/ngx-emoji-mart";




@NgModule({
  declarations: [
    FriendsComponent,
    ChatComponent,
    HeaderComponent,
    PendingFriendRequestsComponent,
  ],
  imports: [
    CommonModule,
    RouterOutlet,
    MainRoutingModule,
    SharedModule,
    FormsModule,
    PickerComponent

  ],
})
export class MainModule { }
