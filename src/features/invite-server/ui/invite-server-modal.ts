import { ChangeDetectionStrategy, Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '@shared/model/modal.service';
import { ApiService } from '@shared/api/api.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '@shared/ui/input';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'InviteServerModal',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent],
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

        <h2 class="text-xl font-semibold mb-4">Пригласить друзей</h2>

        <div *ngIf="inviteUrl && !editing" class="mt-4 animate-fade-in">
          <h3 class="font-medium text-sm mb-2">Отправьте другу ссылку-приглашение на сервер</h3>
          <div class="flex items-center gap-2 mb-2">
            <app-input type="text" class="w-full" [(ngModel)]="inviteUrl" [disabled]="true" />
            <button
              (click)="copyToClipboard()"
              class="px-4 py-2 bg-green-500 text-sm rounded-xl text-white hover:bg-gray-400 transition"
            >
              Скопировать
            </button>
          </div>
          <span class="text-xs">Ваша ссылка-приглашение перестанет действовать через 7 дней.</span>
          <button (click)="editing = true" class="mt-2 text-xs text-gray-400 hover:text-white transition">
            Изменить ссылку-приглашение
          </button>
        </div>

        <form *ngIf="editing" (ngSubmit)="onCreateInvite()">
          <div class="mb-4">
            <label for="maxUses" class="block text-typo-secondary text-sm font-medium mb-1">
              Максимальное количество использований
            </label>
            <app-input id="maxUses" name="maxUses" type="number" placeholder="Максимальное количество использований" [(ngModel)]="maxUses" />
          </div>

          <div class="mb-4">
            <label for="expiresIn" class="block text-typo-secondary text-sm font-medium mb-1">
              Время истечения (в минутах)
            </label>
            <app-input id="expiresIn" name="expiresIn" type="number" placeholder="Время истечения в минутах" [(ngModel)]="expiresIn" />
          </div>

          <div class="flex justify-center gap-2 mt-6">
            <button type="submit" class="px-4 py-2 bg-green-500 text-sm rounded-xl text-white hover:bg-gray-400 transition">
              Создать инвайт
            </button>
          </div>
          <div *ngIf="errorMessage" class="text-red-500 mt-2">{{ errorMessage }}</div>
        </form>
      </div>
    </div>
  `,
})
export class InviteServerModal {
  maxUses = 1;
  expiresIn = 60;
  errorMessage = '';
  inviteUrl: string | null = null;
  serverId: string | null = null;
  editing = false;

  constructor(
    public modalService: ModalService,
    private apiService: ApiService,
    private router: Router
  ) {
    effect(() => {
      const serverId = this.modalService.modalData()?.['serverId'];
      if (serverId) {
        this.serverId = serverId;
        this.inviteUrl = null;
        this.editing = false;
        this.createInitialInvite();
      }
    });
  }

  private createInitialInvite() {
    this.apiService.postInviteLinkServer(this.serverId!, this.maxUses, this.expiresIn).subscribe({
      next: (response) => {
        this.inviteUrl = `${environment.BASE_URL}/invite/${response.invite_token}`;
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = 'Не удалось создать инвайт. Попробуйте еще раз.';
      },
    });
  }

  onCreateInvite() {
    if (!this.serverId) {
      this.errorMessage = 'Ошибка: не выбран сервер.';
      return;
    }

    this.apiService.postInviteLinkServer(this.serverId, this.maxUses, this.expiresIn).subscribe({
      next: (response) => {
        this.inviteUrl = `${environment.BASE_URL}/invite/${response.invite_token}`;
        this.errorMessage = '';
        this.editing = false;
      },
      error: () => {
        this.errorMessage = 'Не удалось создать инвайт. Попробуйте еще раз.';
      },
    });
  }

  copyToClipboard() {
    if (this.inviteUrl) {
      navigator.clipboard.writeText(this.inviteUrl);
    }
  }

  closeModal() {
    this.modalService.close();
  }
}
