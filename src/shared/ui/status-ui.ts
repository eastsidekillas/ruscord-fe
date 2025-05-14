import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserStatusStoreService } from '@shared/model/status-store.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'StatusUI',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="status$ | async as status">
      <span
        class="w-2.5 h-2.5 rounded-full absolute bottom-0 right-0 translate-x-1/8 translate-y-1/8 transition-all duration-300"
        [ngClass]="{
          'bg-green-400': status === 'online',
          'bg-yellow-500': status === 'idle',
          'bg-gray-400': status === 'offline'
        }"></span>
    </ng-container>
  `
})
export class StatusUi implements OnInit {
  @Input() userId!: number;
  status$!: Observable<'online' | 'idle' | 'dnd' | 'offline'>;

  constructor(private userStatusStore: UserStatusStoreService) {}

  ngOnInit(): void {
    this.status$ = this.userStatusStore.getStatus$(this.userId);
  }
}
