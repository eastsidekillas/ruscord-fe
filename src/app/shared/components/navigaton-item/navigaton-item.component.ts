import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../core/services/api.service";
import { Router } from "@angular/router";

@Component({
  selector: 'app-navigaton-item',
  templateUrl: './navigaton-item.component.html',
  styleUrls: ['./navigaton-item.component.css']
})
export class NavigatonItemComponent implements OnInit {
  friends: any;

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.apiService.getFriends().subscribe(friends => { // Use subscribe here instead of then
      this.friends = friends;
    });
  }

  goToDirectMessage(recipientId: number) {
    this.router.navigate(['direct-messages'], { queryParams: { recipientId } }); // Navigate with query params
  }
}
