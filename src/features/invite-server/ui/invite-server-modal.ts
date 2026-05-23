import {
  ChangeDetectionStrategy,
  Component,
  effect,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '@shared/model/modal.service';
import { ApiService } from '@shared/api/api.service';
import { environment } from '../../../environment/environment';

interface ExpiryOption { label: string; minutes: number | null; }
interface UsesOption   { label: string; value: number | null; }

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: '30 минут',  minutes: 30 },
  { label: '1 час',     minutes: 60 },
  { label: '6 часов',   minutes: 360 },
  { label: '12 часов',  minutes: 720 },
  { label: '1 день',    minutes: 1440 },
  { label: '7 дней',    minutes: 10080 },
  { label: 'Никогда',   minutes: null },
];

const USES_OPTIONS: UsesOption[] = [
  { label: 'Без ограничений', value: null },
  { label: '1 использование',  value: 1 },
  { label: '5 использований',  value: 5 },
  { label: '10 использований', value: 10 },
  { label: '25 использований', value: 25 },
  { label: '50 использований', value: 50 },
  { label: '100 использований',value: 100 },
];

@Component({
  selector: 'InviteServerModal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes fade-scale {
      from { opacity: 0; transform: scale(.96) translateY(8px); }
      to   { opacity: 1; transform: scale(1)  translateY(0); }
    }
    .modal-enter { animation: fade-scale .2s ease both; }
  `,
  template: `
    <div class="fixed inset-0 flex items-center justify-center z-50" (click)="closeModal()">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <div class="relative bg-main-surface-secondary text-white w-full max-w-md rounded-2xl shadow-2xl modal-enter"
           (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 class="text-lg font-bold">Пригласить друзей</h2>
            <p class="text-gray-400 text-sm mt-0.5">Поделитесь ссылкой, чтобы пригласить на сервер</p>
          </div>
          <button (click)="closeModal()"
                  class="text-gray-400 hover:text-white transition mt-0.5 flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="px-6 pb-6 flex flex-col gap-5">

          <!-- Link display -->
          <div class="flex items-center gap-2">
            <div class="flex-1 bg-main-surface-primary rounded-xl px-4 py-2.5 flex items-center min-w-0">
              <span *ngIf="loading()" class="text-gray-500 text-sm animate-pulse">Генерация ссылки...</span>
              <span *ngIf="!loading() && inviteUrl()"
                    class="text-gray-200 text-sm truncate font-mono select-all">
                {{ inviteUrl() }}
              </span>
            </div>
            <button (click)="copy()"
                    [disabled]="!inviteUrl()"
                    class="px-4 py-2.5 rounded-xl text-sm font-semibold transition flex-shrink-0"
                    [ngClass]="copied()
                      ? 'bg-green-500/70 text-white cursor-default'
                      : 'bg-green-500 hover:opacity-90 text-white disabled:opacity-40 disabled:cursor-not-allowed'">
              {{ copied() ? 'Скопировано!' : 'Копировать' }}
            </button>
          </div>

          <!-- Settings -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-gray-400 font-medium uppercase tracking-wide">Срок действия</label>
              <select [(ngModel)]="selectedExpiry"
                      (ngModelChange)="regenerate()"
                      class="bg-main-surface-primary text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 outline-none cursor-pointer hover:border-white/20 transition">
                <option *ngFor="let opt of expiryOptions" [ngValue]="opt">{{ opt.label }}</option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-gray-400 font-medium uppercase tracking-wide">Макс. использований</label>
              <select [(ngModel)]="selectedUses"
                      (ngModelChange)="regenerate()"
                      class="bg-main-surface-primary text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 outline-none cursor-pointer hover:border-white/20 transition">
                <option *ngFor="let opt of usesOptions" [ngValue]="opt">{{ opt.label }}</option>
              </select>
            </div>
          </div>

          <!-- Error -->
          <p *ngIf="error()" class="text-red-400 text-sm text-center">{{ error() }}</p>

          <!-- Info line -->
          <p *ngIf="inviteUrl() && !error()" class="text-gray-500 text-xs text-center">
            <ng-container *ngIf="selectedExpiry.minutes; else noExpiry">
              Ссылка истечёт через {{ selectedExpiry.label | lowercase }}.
            </ng-container>
            <ng-template #noExpiry>Ссылка действует бессрочно.</ng-template>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class InviteServerModal {
  protected readonly expiryOptions = EXPIRY_OPTIONS;
  protected readonly usesOptions   = USES_OPTIONS;

  protected selectedExpiry: ExpiryOption = EXPIRY_OPTIONS[5]; // 7 дней
  protected selectedUses: UsesOption     = USES_OPTIONS[0];   // без ограничений

  protected readonly inviteUrl = signal<string | null>(null);
  protected readonly loading   = signal(false);
  protected readonly copied    = signal(false);
  protected readonly error     = signal<string | null>(null);

  private serverId: string | null = null;
  private copyTimer?: ReturnType<typeof setTimeout>;

  constructor(
    public modalService: ModalService,
    private apiService: ApiService,
  ) {
    effect(() => {
      const id = this.modalService.modalData()?.['serverId'];
      if (id && id !== this.serverId) {
        this.serverId = id;
        this.inviteUrl.set(null);
        this.error.set(null);
        this.copied.set(false);
        this.selectedExpiry = EXPIRY_OPTIONS[5];
        this.selectedUses   = USES_OPTIONS[0];
        this.createInvite();
      }
    });
  }

  protected regenerate(): void {
    this.inviteUrl.set(null);
    this.error.set(null);
    this.createInvite();
  }

  private createInvite(): void {
    if (!this.serverId) return;
    this.loading.set(true);
    this.error.set(null);

    this.apiService.postInviteLinkServer(
      this.serverId,
      this.selectedUses.value,
      this.selectedExpiry.minutes,
    ).subscribe({
      next: (res) => {
        this.inviteUrl.set(`${environment.BASE_URL}/invite/${res.invite_token}`);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Не удалось создать ссылку. Попробуйте ещё раз.');
        this.loading.set(false);
      },
    });
  }

  protected copy(): void {
    const url = this.inviteUrl();
    if (!url || this.copied()) return;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copied.set(false), 2500);
    });
  }

  protected closeModal(): void {
    this.modalService.close();
  }
}