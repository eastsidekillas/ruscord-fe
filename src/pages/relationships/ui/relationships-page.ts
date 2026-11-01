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
import { ApiService, PublicUser, RelType, RelTypeValue, Relationship, apiError, errorText, nameOf } from '@shared/api';

interface Row {
  rel: Relationship;
  user: PublicUser | null;
  name: string;
}

interface Group {
  title: string;
  rows: Row[];
}

/** The line after a request's username. */
export function requestNote(type: RelTypeValue): string {
  if (type === RelType.Incoming) return ' · хочет дружить';
  if (type === RelType.Outgoing) return ' · ждёт ответа';
  return '';
}

const BTN = 'h-9 px-3.5 rounded-lg text-[13px] font-semibold';

/** Friends, requests and blocks: everything comes from the gateway state. */
@Component({
  selector: 'RelationshipsPage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FriendsHeader, AvatarUI, StatusUi, StatusUIText],
  template: `
    <FriendsHeader [active]="tab()" [pendingCount]="store.incoming().length + store.outgoing().length" (tabChange)="setTab($event)" />

    <div class="flex-1 overflow-y-auto">
      <div class="p-6 flex flex-col gap-7 max-w-[808px]">
        <!-- Add a friend by exact username, as in Discord -->
        <form class="flex flex-col gap-2" (ngSubmit)="addFriend()">
          <label for="friend-add" class="text-[13px] font-semibold">Добавить в друзья</label>
          <div class="flex gap-2 flex-wrap">
            <input id="friend-add" name="username" [(ngModel)]="username" (ngModelChange)="addResult.set(null)" maxlength="32" autocomplete="off"
                   class="flex-[1_1_240px] h-12 box-border rounded-ok-md border bg-ok-sidebar text-ok-text px-4 placeholder:text-ok-muted"
                   [class.border-ok-danger]="addResult()?.ok === false" [class.border-ok-border-control]="addResult()?.ok !== false"
                   [attr.aria-invalid]="addResult()?.ok === false" aria-describedby="friend-add-result"
                   placeholder="Имя пользователя" />
            <button type="submit" [disabled]="!username.trim() || adding()"
                    class="h-12 px-5 rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold disabled:opacity-50">Отправить заявку</button>
          </div>
          <span id="friend-add-result" class="text-[13px]" [class.text-ok-success]="addResult()?.ok" [class.text-ok-danger]="addResult()?.ok === false">{{ addResult()?.text }}</span>
        </form>

        <input *ngIf="(tab() === 'online' || tab() === 'all') && store.friends().length" [(ngModel)]="query" (ngModelChange)="q.set($event)"
               aria-label="Поиск среди друзей" placeholder="Поиск среди друзей"
               class="h-12 box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-4 placeholder:text-ok-muted" />

        <section *ngFor="let g of groups(); trackBy: byTitle" class="flex flex-col gap-1" [attr.aria-label]="g.title">
          <h2 class="m-0 mb-1.5 text-[12px] font-semibold tracking-[0.1em] text-ok-muted">{{ g.title }} — {{ g.rows.length }}</h2>
          <div *ngFor="let row of g.rows; trackBy: byId" [attr.data-rel]="row.rel.type" class="flex items-center gap-3 flex-wrap px-3 py-2.5 rounded-ok-md bg-ok-sidebar">
            <button type="button" class="flex items-center gap-3 flex-1 min-w-0 text-left" (click)="openProfile(row.rel.id)">
              <span class="relative w-10 h-10 shrink-0 rounded-[10px] bg-ok-avatar">
                <span class="block w-full h-full rounded-[10px] overflow-hidden"><AvatarUI [src]="row.user?.avatar" [name]="row.name" /></span>
                <StatusUI *ngIf="row.rel.type === 1" [userId]="row.rel.id" [large]="true" />
              </span>
              <span class="flex flex-col min-w-0">
                <span class="font-semibold truncate">{{ row.name }}</span>
                <StatusUIText *ngIf="row.rel.type === 1" [userId]="row.rel.id" size="text-[13px]" />
                <span *ngIf="row.rel.type !== 1" class="text-[13px] text-ok-muted truncate">{{ row.user?.username }}{{ note(row.rel.type) }}</span>
              </span>
            </button>
            <ng-container [ngSwitch]="row.rel.type">
              <ng-container *ngSwitchCase="1">
                <button type="button" [class]="btn" (click)="openChat(row.rel.id)">Написать</button>
                <button type="button" [class]="btn" (click)="removeFriend(row)">Удалить из друзей</button>
                <button type="button" [class]="btn + ' !text-ok-danger'" (click)="block(row)">Заблокировать</button>
              </ng-container>
              <ng-container *ngSwitchCase="3">
                <button type="button" [class]="btnAccent" (click)="accept(row.rel.id)">Принять</button>
                <button type="button" [class]="btn" (click)="drop(row.rel.id, 'Не удалось отклонить запрос')">Отклонить</button>
              </ng-container>
              <button *ngSwitchCase="4" type="button" [class]="btn" (click)="drop(row.rel.id, 'Не удалось отменить запрос')">Отменить</button>
              <button *ngSwitchCase="2" type="button" [class]="btn" (click)="drop(row.rel.id, 'Не удалось разблокировать')">Разблокировать</button>
            </ng-container>
          </div>
        </section>

        <p *ngIf="store.loaded() && !groups().length" class="m-0 text-center text-ok-muted text-[13px]">{{ empty() }}</p>
      </div>
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

  protected readonly groups = computed<Group[]>(() => {
    const sort = (a: Row, b: Row) => a.name.localeCompare(b.name, 'ru');
    const rows = (rels: Relationship[]) => rels.map(this.toRow).sort(sort);
    const keep = (gs: Group[]) => gs.filter(g => g.rows.length);
    switch (this.tab()) {
      case 'online':
      case 'all': {
        const q = this.q().trim().toLowerCase();
        const list = rows(this.store.friends())
          .filter(r => this.tab() === 'all' || this.store.status(r.rel.id) !== 'offline')
          .filter(r => !q || r.name.toLowerCase().includes(q) || (r.user?.username ?? '').includes(q));
        return keep([{ title: this.tab() === 'online' ? 'В СЕТИ' : 'ВСЕ ДРУЗЬЯ', rows: list }]);
      }
      case 'pending':
        return keep([
          { title: 'ВХОДЯЩИЕ', rows: rows(this.store.incoming()) },
          { title: 'ИСХОДЯЩИЕ', rows: rows(this.store.outgoing()) },
        ]);
      default:
        return keep([{ title: 'ЗАБЛОКИРОВАННЫЕ', rows: rows(this.store.blocked()) }]);
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

  protected readonly btn = `${BTN} bg-ok-surface-2 text-ok-text hover:bg-ok-border`;
  protected readonly btnAccent = `${BTN} bg-ok-accent text-ok-on-accent`;

  protected byId = (_: number, r: Row) => r.rel.id;
  protected byTitle = (_: number, g: Group) => g.title;

  protected readonly note = requestNote;

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

  protected block(row: Row): void {
    if (!confirm(`Заблокировать ${row.name}? Дружба и заявки пропадут, писать вам будет нельзя.`)) return;
    this.api.block(row.rel.id).subscribe({
      error: err => this.notify.show(errorText(err, 'Не удалось заблокировать'), 'error'),
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
