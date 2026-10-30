import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FriendsHeader, FriendsTab } from '@widgets/friends';
import { NotificationService } from '@shared/model/notification.service';
import { ModalService } from '@shared/model/modal.service';
import { AvatarUI } from '@shared/ui/avatar';
import { StatusUi, StatusUIText } from '@entities/user-status';
import { AppStateStore } from '@entities/app-state';
import { ApiService, PublicUser, Relationship, apiError, errorText, nameOf } from '@shared/api';

interface Row {
  rel: Relationship;
  user: PublicUser | null;
  name: string;
}

/** Friends, requests and blocks: everything comes from the gateway state. */
@Component({
  selector: 'RelationshipsPage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FriendsHeader, AvatarUI, StatusUi, StatusUIText],
  template: `
    <FriendsHeader [active]="tab()" [pendingCount]="store.incoming().length" (tabChange)="setTab($event)" />

    <!-- Add a friend by exact username, as in Discord -->
    <div *ngIf="tab() === 'add'" class="px-6 pt-6">
      <h2 class="text-xl font-semibold text-typo-secondary">Добавить в друзья</h2>
      <p class="text-sm text-typo-secondary mt-1">Введите имя пользователя целиком, например <span class="text-gray-300">ivan.petrov</span>.</p>
      <form class="mt-4 flex gap-3" (ngSubmit)="addFriend()">
        <input name="username" [(ngModel)]="username" (ngModelChange)="addResult.set(null)" maxlength="32" autocomplete="off"
               class="flex-1 p-3 bg-main-surface-secondary text-sm text-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
               placeholder="Имя пользователя" />
        <button type="submit" [disabled]="!username.trim() || adding()"
                class="text-sm text-white px-4 rounded-md bg-green-500 disabled:bg-gray-600 transition">
          Отправить запрос
        </button>
      </form>
      <p *ngIf="addResult() as r" class="mt-3 text-sm" [class.text-green-400]="r.ok" [class.text-red-400]="!r.ok">{{ r.text }}</p>
    </div>

    <div *ngIf="tab() !== 'add'" class="px-6 pt-6 flex flex-col gap-2">
      <input *ngIf="tab() === 'online' || tab() === 'all'" [(ngModel)]="query" (ngModelChange)="q.set($event)"
             class="w-full p-3 mb-2 bg-main-surface-secondary text-sm text-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
             placeholder="Поиск среди друзей" />

      <h3 class="text-xs uppercase tracking-wide text-typo-secondary mb-1">{{ heading() }}</h3>

      <div *ngFor="let row of rows(); trackBy: byId"
           class="flex items-center justify-between py-3 px-3 rounded-md bg-main-surface-secondary hover:bg-main-surface-primary transition">
        <button class="flex items-center space-x-3 min-w-0 text-left" (click)="openProfile(row.rel.id)">
          <div class="relative w-10 h-10 shrink-0">
            <div class="w-full h-full rounded-full overflow-hidden">
              <AvatarUI [src]="row.user?.avatar" [name]="row.name" />
            </div>
            <StatusUI *ngIf="row.rel.type === 1" [userId]="row.rel.id"></StatusUI>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-sm text-gray-200 font-medium truncate">{{ row.name }}</span>
            <StatusUIText *ngIf="row.rel.type === 1" [userId]="row.rel.id" />
            <span *ngIf="row.rel.type === 3" class="text-xs text-typo-secondary">Входящий запрос</span>
            <span *ngIf="row.rel.type === 4" class="text-xs text-typo-secondary">Исходящий запрос</span>
            <span *ngIf="row.rel.type === 2" class="text-xs text-typo-secondary">{{ row.user?.username }}</span>
          </div>
        </button>

        <div class="flex gap-2 shrink-0">
          <ng-container [ngSwitch]="row.rel.type">
            <ng-container *ngSwitchCase="1">
              <button class="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10" (click)="openChat(row.rel.id)">Написать</button>
              <button class="text-xs text-red-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500" (click)="removeFriend(row)">Удалить</button>
            </ng-container>
            <ng-container *ngSwitchCase="3">
              <button class="text-xs text-white px-3 py-1.5 rounded-lg bg-green-500" (click)="accept(row.rel.id)">Принять</button>
              <button class="text-xs text-white px-3 py-1.5 rounded-lg bg-red-500" (click)="drop(row.rel.id, 'Не удалось отклонить запрос')">Отклонить</button>
            </ng-container>
            <button *ngSwitchCase="4" class="text-xs text-gray-300 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10" (click)="drop(row.rel.id, 'Не удалось отменить запрос')">Отменить</button>
            <button *ngSwitchCase="2" class="text-xs text-gray-300 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10" (click)="drop(row.rel.id, 'Не удалось разблокировать')">Разблокировать</button>
          </ng-container>
        </div>
      </div>

      <p *ngIf="store.loaded() && !rows().length" class="text-center text-typo-secondary text-sm mt-8">{{ empty() }}</p>
    </div>
  `,
})
export class RelationshipsPage {
  protected readonly store = inject(AppStateStore);
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);
  private readonly modal = inject(ModalService);
  private readonly router = inject(Router);

  protected readonly tab = signal<FriendsTab>('online');
  protected readonly q = signal('');
  protected query = '';
  protected username = '';
  protected readonly adding = signal(false);
  protected readonly addResult = signal<{ ok: boolean; text: string } | null>(null);

  private toRow = (rel: Relationship): Row => {
    const user = this.store.user(rel.user ?? null);
    return { rel, user, name: nameOf(user) };
  };

  protected readonly rows = computed<Row[]>(() => {
    const sort = (a: Row, b: Row) => a.name.localeCompare(b.name, 'ru');
    switch (this.tab()) {
      case 'online':
      case 'all': {
        const q = this.q().trim().toLowerCase();
        return this.store.friends()
          .map(this.toRow)
          .filter(r => this.tab() === 'all' || this.store.status(r.rel.id) !== 'offline')
          .filter(r => !q || r.name.toLowerCase().includes(q) || (r.user?.username ?? '').includes(q))
          .sort(sort);
      }
      case 'pending':
        return [...this.store.incoming().map(this.toRow).sort(sort), ...this.store.outgoing().map(this.toRow).sort(sort)];
      case 'blocked':
        return this.store.blocked().map(this.toRow).sort(sort);
      default:
        return [];
    }
  });

  protected readonly heading = computed(() => {
    const n = this.rows().length;
    switch (this.tab()) {
      case 'online': return `В сети — ${n}`;
      case 'all': return `Все друзья — ${n}`;
      case 'pending': return `Ожидание — ${n}`;
      default: return `Заблокированные — ${n}`;
    }
  });

  protected readonly empty = computed(() => {
    if (this.q().trim() && (this.tab() === 'online' || this.tab() === 'all')) return 'Никого не нашлось среди ваших друзей';
    switch (this.tab()) {
      case 'online': return 'Никого нет в сети';
      case 'all': return 'У вас пока нет друзей. Добавьте кого-нибудь по имени пользователя.';
      case 'pending': return 'Нет ожидающих запросов';
      default: return 'Вы никого не заблокировали';
    }
  });

  protected byId = (_: number, r: Row) => r.rel.id;

  protected setTab(t: FriendsTab): void {
    this.tab.set(t);
    this.addResult.set(null);
  }

  protected addFriend(): void {
    const name = this.username.trim();
    if (!name || this.adding()) return;
    this.adding.set(true);
    this.api.requestFriend(name).subscribe({
      next: () => {
        this.adding.set(false);
        this.addResult.set({ ok: true, text: `Запрос в друзья отправлен: ${name}` });
        this.username = '';
      },
      error: err => {
        this.adding.set(false);
        // The server answers the same for "no such user" and "they blocked you" (ADR-0014).
        const text = apiError(err)?.code === 'request_failed'
          ? 'Не получилось. Проверьте, что имя пользователя написано без ошибок.'
          : errorText(err, 'Не удалось отправить запрос');
        this.addResult.set({ ok: false, text });
      },
    });
  }

  protected accept(userId: string): void {
    this.api.acceptOrRequest(userId).subscribe({
      error: err => this.notify.show(errorText(err, 'Не удалось принять запрос'), 'error'),
    });
  }

  protected drop(userId: string, failText: string): void {
    this.api.removeRelationship(userId).subscribe({
      error: err => this.notify.show(errorText(err, failText), 'error'),
    });
  }

  protected removeFriend(row: Row): void {
    if (confirm(`Удалить ${row.name} из друзей?`)) this.drop(row.rel.id, 'Не удалось удалить из друзей');
  }

  protected openChat(userId: string): void {
    this.api.openDM(userId).subscribe({
      next: dm => {
        this.store.noteDM(dm);
        this.router.navigate(['/channels/me', dm.id]);
      },
      error: err => this.notify.show(errorText(err, 'Не удалось открыть переписку'), 'error'),
    });
  }

  protected openProfile(userId: string): void {
    this.modal.open('userProfile', { userId });
  }
}
