import {Component, OnInit} from '@angular/core';
import {ApiService} from "../../utils/services/api.service";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  profile: any;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getProfile().then(data => {
      this.profile = data;
    });
  }

  close() {
    // Логика для закрытия профиля
    this.profile = null;
  }
}
