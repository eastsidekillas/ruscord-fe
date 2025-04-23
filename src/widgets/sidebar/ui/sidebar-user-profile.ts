import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {StatusUIText} from '@shared/ui/status-ui-text';

@Component({
  selector: 'SidebarUserProfile',
  standalone: true,
  imports: [CommonModule, StatusUIText,],
  template: `
    <div class="bg-main-surface-secondary rounded-xl shadow-lg p-4 flex items-center">
      <div class="flex items-center space-x-3">
        <img
          [src]="avatarUrl"
          alt="avatar"
          class="w-10 h-10 rounded-full object-cover border border-gray-600"
        />
        <div>
          <div class="text-sm font-semibold text-white">{{ username }}</div>
          <StatusUIText [userId]="userId" />
        </div>
      </div>
      <button class="ml-auto text-gray-400 hover:text-white transition">

        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path fill-rule="evenodd" d="M9.586 2.586A2 2 0 0 1 11 2h2a2 2 0 0 1 2 2v.089l.473.196.063-.063a2.002 2.002 0 0 1 2.828 0l1.414 1.414a2 2 0 0 1 0 2.827l-.063.064.196.473H20a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-.089l-.196.473.063.063a2.002 2.002 0 0 1 0 2.828l-1.414 1.414a2 2 0 0 1-2.828 0l-.063-.063-.473.196V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.089l-.473-.196-.063.063a2.002 2.002 0 0 1-2.828 0l-1.414-1.414a2 2 0 0 1 0-2.827l.063-.064L4.089 15H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h.09l.195-.473-.063-.063a2 2 0 0 1 0-2.828l1.414-1.414a2 2 0 0 1 2.827 0l.064.063L9 4.089V4a2 2 0 0 1 .586-1.414ZM8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clip-rule="evenodd"/>
        </svg>

      </button>
    </div>
  `,
})
export class SidebarUserProfile {
  @Input() username: string = 'Пользователь';
  @Input() avatarUrl: string = 'https://via.placeholder.com/150';
  @Input() userId!: string;
}
