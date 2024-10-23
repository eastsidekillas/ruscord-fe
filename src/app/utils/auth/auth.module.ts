import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthRoutingModule } from './auth-routing.module';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {CookieService} from "ngx-cookie-service";
import {HTTP_INTERCEPTORS, HttpClientModule, HttpClientXsrfModule} from "@angular/common/http";
import {CsrfInterceptor} from "../interceptors/csrf.interceptor";
import {AuthFormComponent} from "./auth-form/auth-form.component";



@NgModule({
  declarations: [
    AuthFormComponent,
  ],

  imports: [
      CommonModule,
      FormsModule,
      ReactiveFormsModule,
      AuthRoutingModule,

  ],

  providers: [
    CookieService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CsrfInterceptor,
      multi: true
    }
  ],

})

export class AuthModule { }
