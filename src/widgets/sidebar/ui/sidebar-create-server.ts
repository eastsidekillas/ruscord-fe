import { Component, OnInit } from '@angular/core';
import {CommonModule} from '@angular/common';
import {ModalService} from '@shared/model/modal.service';

@Component({
  selector: 'SidebarCreateServer',
  standalone: true,
  imports: [CommonModule],
  template:
    `
      <button
        (click)="openCreateServerModal()"
        class="w-12 h-12 bg-main-surface-secondary rounded-full flex items-center justify-center mb-2 lg:mb-4 hover:bg-gray-500"
      >
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 4v16m8-8H4" />
        </svg>
      </button>
    `,
})
export class SidebarCreateServer {

  constructor(private modalService: ModalService) {}

  openCreateServerModal() {
    this.modalService.open('createServer');
  }
}
