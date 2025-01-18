import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  @Input() context!: 'friends' | 'chat'; // Контекст: "friends" или "chat"
  @Input() friend!: { username: string; avatar: string } | null; // Данные друга для чата
  @Output() startCall = new EventEmitter<void>();
  @Output() filterChanged: EventEmitter<'all' | 'waiting' | 'online'> = new EventEmitter();

  activeFilter: string = 'all';


  changeFilter(filter: 'all' | 'waiting' | 'online') {
    this.activeFilter = filter;
    this.filterChanged.emit(filter);
  }

  onStartCall(): void {
    this.startCall.emit(); // Отправляем событие родителю
  }
}
