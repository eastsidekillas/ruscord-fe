import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {DirectMessageComponent} from "./direct-mesage/direct-message.component";

const routes: Routes = [

  { path: ':id', component: DirectMessageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
