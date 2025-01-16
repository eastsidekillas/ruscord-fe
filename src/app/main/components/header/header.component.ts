import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  @Input() context!: 'friends' | 'chat'; // Контекст: "friends" или "chat"
  @Input() friend!: { username: string; avatar: string } | null; // Данные друга для чата
}
