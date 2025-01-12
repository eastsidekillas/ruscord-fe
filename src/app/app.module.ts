import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {CookieService} from "ngx-cookie-service";
import {HTTP_INTERCEPTORS} from "@angular/common/http";
import {CsrfInterceptor} from "./auth/interceptors/csrf.interceptor";
import {FormsModule} from "@angular/forms";
import {AuthModule} from "./auth/auth.module";
import {CommonModule, registerLocaleData } from "@angular/common";
import {MainModule} from "./main/main.module";
import localeRu from '@angular/common/locales/ru';
import { LOCALE_ID } from '@angular/core';

registerLocaleData(localeRu);

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    CommonModule,
    BrowserModule,
    AuthModule,
    MainModule,
    AppRoutingModule,
    FormsModule,
  ],
  providers: [
    CookieService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CsrfInterceptor,
      multi: true
    },
    { provide: LOCALE_ID, useValue: 'ru' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
