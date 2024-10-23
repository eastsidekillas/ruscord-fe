import {Component, OnInit} from '@angular/core';
import {ApiService} from "../../utils/services/api.service";

@Component({
  selector: 'app-friends',
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.css'
})
export class FriendsComponent implements OnInit {
  friends: any;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getFriends().then(data => {
      this.friends = data;
    });
  }
}
