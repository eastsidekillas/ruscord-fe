import { NgModule } from '@angular/core';
import {CommonModule} from '@angular/common';
import {NavigatonSidebarComponent} from "./components/navigaton-sidebar/navigaton-sidebar.component";
import {NavigatonItemDMComponent} from "./components/navigaton-item-dm/navigaton-item-dm.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {CookieService} from "ngx-cookie-service";
import {HTTP_INTERCEPTORS} from "@angular/common/http";
import {CsrfInterceptor} from "../auth/interceptors/csrf.interceptor";
import { NavigatonSidebarServersComponent } from './components/navigaton-sidebar-servers/navigaton-sidebar-servers.component';
import { NavigatonSidebarMeComponent } from './components/navigaton-sidebar-me/navigaton-sidebar-me.component';
import {RouterLink, RouterOutlet} from "@angular/router";
import { NavigationProfileModalComponent } from './components/navigation-profile-modal/navigation-profile-modal.component';
import { CallComponent } from './components/call/call.component';
import { DarkLayoutComponent } from './layouts/dark-layout/dark-layout.component';


@NgModule({
  declarations: [
    NavigatonSidebarComponent,
    NavigatonItemDMComponent,
    NavigatonSidebarServersComponent,
    NavigatonSidebarMeComponent,
    NavigationProfileModalComponent,
    CallComponent,
    DarkLayoutComponent,
  ],

  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    RouterOutlet,

  ],
  providers: [
    CookieService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CsrfInterceptor,
      multi: true
    }
  ],
    exports: [
        NavigatonSidebarComponent,
        CallComponent,
        NavigatonSidebarServersComponent
    ],
})
export class SharedModule { }
