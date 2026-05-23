import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@shared/api/api.service';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { AvatarUI } from '@shared/ui/avatar';

interface DmTarget {
  channel_id: string;
  friend_name: string;
  friend_avatar: string | null;
}

interface ServerChannel {
  id: string;
  name: string;
}

interface ServerTarget {
  server_id: string;
  server_name: string;
  server_avatar: string | null;
  channels: ServerChannel[];
  expanded: boolean;
}

@Component({
  selector: 'ForwardMessageModal',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
         (click)="onBackdropClick($event)">
      <div class="bg-main-surface-primary rounded-xl w-[460px] max-h-[580px] flex flex-col shadow-2xl"
           (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 class="text-white font-semibold">Переслать сообщение</h2>
            <p class="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
              {{ previewText() }}
            </p>
          </div>
          <button (click)="close()"
                  class="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Search -->
        <div class="px-4 py-3 border-b border-white/10">
          <div class="flex items-center gap-2 bg-main-surface-secondary rounded-lg px-3 py-2">
            <svg class="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              [(ngModel)]="query"
              placeholder="Поиск..."
              class="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
            />
          </div>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto py-2">

          <!-- Loading -->
          <div *ngIf="isLoading()" class="flex items-center justify-center py-12">
            <div class="w-6 h-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin"></div>
          </div>

          <ng-container *ngIf="!isLoading()">

            <!-- DMs -->
            <div *ngIf="filteredDms().length > 0" class="mb-2">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-1">
                Личные сообщения
              </p>
              <div *ngFor="let dm of filteredDms()"
                   class="flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-gray-700 shrink-0">
                  <AvatarUI [src]="dm.friend_avatar" [name]="dm.friend_name" />
                </div>
                <span class="flex-1 text-sm text-gray-300 truncate">{{ dm.friend_name }}</span>
                <button
                  (click)="forward(dm.channel_id)"
                  [disabled]="sendingTo() === dm.channel_id"
                  class="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50
                         text-xs font-medium text-white transition-colors shrink-0"
                >
                  {{ sendingTo() === dm.channel_id ? '...' : 'Переслать' }}
                </button>
              </div>
            </div>

            <!-- Servers -->
            <div *ngFor="let srv of filteredServers()" class="mb-2">
              <!-- Server header (collapsible) -->
              <button
                (click)="srv.expanded = !srv.expanded"
                class="w-full flex items-center gap-2 px-4 py-1.5 hover:bg-white/5 transition-colors"
              >
                <div class="w-5 h-5 rounded overflow-hidden bg-gray-700 shrink-0">
                  <AvatarUI [src]="srv.server_avatar" [name]="srv.server_name" />
                </div>
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1 text-left truncate">
                  {{ srv.server_name }}
                </span>
                <svg class="w-3.5 h-3.5 text-gray-600 transition-transform"
                     [class.rotate-180]="srv.expanded"
                     fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              <!-- Channels -->
              <div *ngIf="srv.expanded">
                <div *ngFor="let ch of srv.channels"
                     class="flex items-center gap-3 px-4 py-1.5 hover:bg-white/5 transition-colors pl-9">
                  <svg class="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" d="M5 7h14M5 12h14M5 17h14"/>
                  </svg>
                  <span class="flex-1 text-sm text-gray-300 truncate">{{ ch.name }}</span>
                  <button
                    (click)="forward(ch.id)"
                    [disabled]="sendingTo() === ch.id"
                    class="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50
                           text-xs font-medium text-white transition-colors shrink-0"
                  >
                    {{ sendingTo() === ch.id ? '...' : 'Переслать' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty -->
            <div *ngIf="filteredDms().length === 0 && filteredServers().length === 0"
                 class="flex flex-col items-center py-12 text-gray-600 text-sm gap-2">
              <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
              Ничего не найдено
            </div>

          </ng-container>
        </div>

      </div>
    </div>
  `,
})
export class ForwardMessageModal implements OnInit {
  private readonly api = inject(ApiService);
  private readonly modalService = inject(ModalService);
  private readonly notifications = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly sendingTo = signal<string | null>(null);
  readonly query = signal('');

  private readonly dms = signal<DmTarget[]>([]);
  private readonly servers = signal<ServerTarget[]>([]);

  readonly filteredDms = computed(() => {
    const q = this.query().toLowerCase();
    return this.dms().filter(d => !q || d.friend_name.toLowerCase().includes(q));
  });

  readonly filteredServers = computed(() => {
    const q = this.query().toLowerCase();
    if (!q) return this.servers();
    return this.servers()
      .map(s => ({
        ...s,
        channels: s.channels.filter(c => c.name.toLowerCase().includes(q)),
        expanded: true,
      }))
      .filter(s => s.server_name.toLowerCase().includes(q) || s.channels.length > 0);
  });

  get messageId(): string {
    return this.modalService.modalData()['messageId'] ?? '';
  }

  previewText = () => {
    const text: string = this.modalService.modalData()['content'] ?? '';
    return text.length > 60 ? text.slice(0, 60) + '…' : text;
  };

  ngOnInit() {
    this.api.getForwardTargets().subscribe({
      next: (data: any) => {
        this.dms.set(data.dms ?? []);
        this.servers.set(
          (data.servers ?? []).map((s: any) => ({ ...s, expanded: true }))
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.notifications.show('Не удалось загрузить список', 'error');
        this.isLoading.set(false);
      },
    });
  }

  forward(channelId: string) {
    if (this.sendingTo()) return;
    this.sendingTo.set(channelId);

    this.api.forwardMessage(this.messageId, channelId).subscribe({
      next: () => {
        this.notifications.show('Сообщение переслано', 'success');
        this.close();
      },
      error: () => {
        this.notifications.show('Ошибка при пересылке', 'error');
        this.sendingTo.set(null);
      },
    });
  }

  close() {
    this.modalService.close();
  }

  onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }
}
