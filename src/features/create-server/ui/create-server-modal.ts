import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '@shared/model/modal.service';
import { ApiService } from '@shared/api/api.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'CreateServerModal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 flex items-center justify-center z-50">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <div class="relative bg-main-surface-primary text-white w-full max-w-md p-6 rounded-2xl shadow-xl">
        <button
          (click)="closeModal()"
          class="absolute top-4 right-4 text-gray-400 hover:text-white transition"
          aria-label="Закрыть"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 class="text-xl font-semibold text-center mb-4">Персонализируйте свой сервер</h2>
        <p class="text-sm font-light text-center mb-4">Персонализируйте свой новый сервер, выбрав ему название и аватар.</p>

        <form (ngSubmit)="onCreateServer()">
          <div class="mb-4 flex flex-col items-center gap-3">
            <label
              for="avatar"
              class="relative w-24 h-24 rounded-full overflow-hidden bg-main-surface-secondary border border-gray-700 cursor-pointer group"
            >
              <img *ngIf="avatarPreviewUrl" [src]="avatarPreviewUrl" alt="Preview" class="w-full h-full object-cover" />

              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>

              <input type="file" id="avatar" (change)="onFileSelected($event)" accept="image/*" class="hidden" />
            </label>
          </div>

          <div class="mb-4">
            <label for="channelName" class="block text-typo-secondary text-sm font-medium mb-1">
              Название сервера
            </label>
            <input
              id="channelName"
              name="channelName"
              required
              type="text"
              class="w-full px-3 py-2 rounded-xl bg-main-surface-secondary text-white placeholder-typo-secondary border border-gray-700 focus:outline-none focus:ring-green-500 transition"
              placeholder="Название сервера"
              [(ngModel)]="serverName"
            />
          </div>

          <div class="flex justify-center gap-2 mt-6">
            <button type="submit" class="px-4 py-2 bg-green-500 text-sm rounded-xl text-white hover:bg-green-600 transition">
              Создать сервер
            </button>
          </div>
          <div *ngIf="errorMessage" class="text-red-500 mt-2">{{ errorMessage }}</div>
        </form>
      </div>
    </div>
  `,
})
export class CreateServerModal {
  serverName = 'Мой сервер';
  errorMessage = '';
  selectedFile: File | null = null;
  avatarPreviewUrl: string | null = null;

  constructor(
    public modalService: ModalService,
    private apiService: ApiService,
    private router: Router
  ) {}

  onCreateServer() {
    if (!this.serverName.trim()) {
      this.errorMessage = 'Пожалуйста, введите название сервера.';
      return;
    }

    const formData = new FormData();
    formData.append('name', this.serverName);
    if (this.selectedFile) {
      formData.append('avatar', this.selectedFile);
    }

    this.apiService.postCreateServer(formData).subscribe({
      next: (response) => {
        this.modalService.close();
        this.router.navigate(['/channels', response.id, response.default_channel_id]);
      },
      error: () => {
        this.errorMessage = 'Не удалось создать сервер. Попробуйте еще раз.';
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      this.avatarPreviewUrl = URL.createObjectURL(this.selectedFile);
    }
  }

  closeModal() {
    if (this.avatarPreviewUrl) {
      URL.revokeObjectURL(this.avatarPreviewUrl);
      this.avatarPreviewUrl = null;
    }
    this.modalService.close();
  }
}
