import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {NavigatonSidebarComponent} from "./components/navigaton-sidebar/navigaton-sidebar.component";
import {NavigatonItemComponent} from "./components/navigaton-item/navigaton-item.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {CookieService} from "ngx-cookie-service";
import {HTTP_INTERCEPTORS} from "@angular/common/http";
import {CsrfInterceptor} from "../auth/interceptors/csrf.interceptor";


@NgModule({
  declarations: [
    NavigatonSidebarComponent,
    NavigatonItemComponent,
  ],

  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

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
    NavigatonSidebarComponent
  ],
})
export class SharedModule { }
