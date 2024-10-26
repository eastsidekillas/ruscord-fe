import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../core/services/api.service";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profile: any;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getProfile().subscribe((data: any) => {
      this.profile = data;

        localStorage.setItem('user_id', data.id);
    });
  }

  close() {
    // Логика для закрытия профиля
    this.profile = null;
  }
}
