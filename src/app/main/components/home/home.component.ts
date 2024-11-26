import {Component, OnInit} from '@angular/core';
import {AuthService} from "../../../auth/services/auth.service";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit{
  isProfileVisible = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.checkToken();
  }

  toggleProfilePopup() {
    this.isProfileVisible = !this.isProfileVisible;
  }
}
