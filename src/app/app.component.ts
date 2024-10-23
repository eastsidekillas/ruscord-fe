import {Component, OnInit} from '@angular/core';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'ruscord-fe';

  ngOnInit(): void {
    initFlowbite();
  }
}
