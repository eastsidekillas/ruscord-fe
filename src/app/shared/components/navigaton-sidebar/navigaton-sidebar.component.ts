import {Component, OnInit} from '@angular/core';
import {ApiService} from "../../../core/services/api.service";


@Component({
  selector: 'app-navigaton-sidebar',
  templateUrl: './navigaton-sidebar.component.html',
  styleUrl: './navigaton-sidebar.component.css'
})
export class NavigatonSidebarComponent implements OnInit {
  constructor(private apiService: ApiService) {}

  ngOnInit() {
  }
}
