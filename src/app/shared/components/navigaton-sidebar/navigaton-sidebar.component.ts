import {Component, OnInit} from '@angular/core';
import {ApiService} from "../../../core/services/api.service";
import {AuthService} from "../../../auth/services/auth.service";


@Component({
  selector: 'app-navigaton-sidebar',
  templateUrl: './navigaton-sidebar.component.html',
  styleUrl: './navigaton-sidebar.component.css'
})
export class NavigatonSidebarComponent implements OnInit {
  profile: any;
  isProfileModalVisible: boolean = false;

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    this.apiService.getProfile().subscribe((data: any) => {
      this.profile = data;

      localStorage.setItem('user_id', data.id);
    });
  }

  // Открытие модального окна
  openProfileModal(): void {
    this.isProfileModalVisible = true;
  }

  closeProfileModal() {
    this.isProfileModalVisible = false;
  }

  // Метод выхода из аккаунта
  logout() {
    this.authService.logout(); // Вызываем метод logout из AuthService
  }

}
