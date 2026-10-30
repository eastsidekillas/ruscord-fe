import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { ApiService, errorText } from '@shared/api';
import { AppStateStore } from '@entities/app-state';

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
              <img *ngIf="avatarPreviewUrl()" [src]="avatarPreviewUrl()" alt="Preview" class="w-full h-full object-cover" />

              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>

              <input type="file" id="avatar" (change)="onFileSelected($event)" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" />
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
            <button type="submit" [disabled]="creating()" class="disabled:opacity-50 px-4 py-2 bg-green-500 text-sm rounded-xl text-white hover:bg-green-600 transition">
              Создать сервер
            </button>
          </div>
          <div *ngIf="errorMessage()" class="text-red-500 mt-2">{{ errorMessage() }}</div>
        </form>
      </div>
    </div>
  `,
})
export class CreateServerModal {
  serverName = 'Мой сервер';
  readonly errorMessage = signal('');
  readonly avatarPreviewUrl = signal<string | null>(null);
  readonly creating = signal(false);
  private selectedFile: File | null = null;

  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  readonly modalService = inject(ModalService);

  /** Creates the guild, then uploads the icon; a failed icon does not undo the guild. */
  onCreateServer() {
    const name = this.serverName.trim();
    if (name.length < 2 || name.length > 100) {
      this.errorMessage.set('Название — от 2 до 100 символов.');
      return;
    }
    if (this.creating()) return;
    this.creating.set(true);
    this.api.createGuild(name).subscribe({
      next: guild => {
        this.store.noteGuild(guild);
        if (this.selectedFile) {
          this.api.setGuildIcon(guild.id, this.selectedFile).subscribe({
            error: err => this.notify.show(errorText(err, 'Сервер создан, но иконку загрузить не удалось'), 'error'),
          });
        }
        this.closeModal();
        this.router.navigate(['/channels', guild.id]);
      },
      error: err => {
        this.creating.set(false);
        this.errorMessage.set(errorText(err, 'Не удалось создать сервер. Попробуйте еще раз.'));
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 8 << 20) {
      this.errorMessage.set('Файл больше 8 МиБ.');
      return;
    }
    this.revokePreview();
    this.selectedFile = file;
    this.avatarPreviewUrl.set(URL.createObjectURL(file));
    this.errorMessage.set('');
  }

  closeModal() {
    this.revokePreview();
    this.modalService.close();
  }

  private revokePreview(): void {
    const url = this.avatarPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.avatarPreviewUrl.set(null);
  }
}
