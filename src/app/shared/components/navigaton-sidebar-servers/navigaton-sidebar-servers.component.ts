import { Component } from '@angular/core';
import {AuthService} from "../../../auth/services/auth.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-navigaton-sidebar-servers',
  templateUrl: './navigaton-sidebar-servers.component.html',
  styleUrl: './navigaton-sidebar-servers.component.css'
})
export class NavigatonSidebarServersComponent {
  constructor(private authService: AuthService, private router: Router) {}

  // Метод выхода из аккаунта
  logout() {
    this.authService.logout();
  }
}
