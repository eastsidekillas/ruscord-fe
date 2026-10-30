import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Ban, FullGuild, errorText, nameOf } from '@shared/api';
import { AvatarUI } from '@shared/ui/avatar';

/** The ban list of a guild (BAN_MEMBERS): who, why, and lifting a ban. */
@Component({
  selector: 'BansTab',
  standalone: true,
  imports: [CommonModule, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p *ngIf="error()" class="text-red-400 text-sm mb-2">{{ error() }}</p>
    <div class="flex flex-col gap-1 max-h-80 overflow-y-auto pr-1">
      <div *ngFor="let b of bans(); trackBy: byId" class="flex items-center gap-2 py-1.5">
        <div class="w-8 h-8 rounded-full overflow-hidden shrink-0"><AvatarUI [src]="b.user.avatar" [name]="name(b)" /></div>
        <div class="min-w-0 flex-1">
          <div class="text-sm truncate">{{ name(b) }}</div>
          <div class="text-xs text-typo-secondary truncate">
            {{ b.created_at | date:'dd.MM.yyyy' }}<ng-container *ngIf="b.reason"> · {{ b.reason }}</ng-container>
          </div>
        </div>
        <button type="button" (click)="unban(b)" [disabled]="busy()"
                class="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50">Разбанить</button>
      </div>
      <p *ngIf="loaded() && !bans().length" class="text-sm text-typo-secondary">Банов нет.</p>
    </div>
  `,
})
export class BansTab implements OnInit {
  readonly guild = input.required<FullGuild>();
  private readonly api = inject(ApiService);

  protected readonly bans = signal<Ban[]>([]);
  protected readonly loaded = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.bans(this.guild().id).subscribe({
      next: list => {
        this.bans.set(list);
        this.loaded.set(true);
      },
      error: err => {
        this.loaded.set(true);
        this.error.set(errorText(err, 'Не удалось загрузить баны'));
      },
    });
  }

  protected byId = (_: number, b: Ban) => b.user_id;
  protected name(b: Ban): string { return nameOf(b.user); }

  protected unban(b: Ban): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.unban(this.guild().id, b.user_id).subscribe({
      next: () => {
        this.busy.set(false);
        this.bans.update(list => list.filter(x => x.user_id !== b.user_id));
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorText(err, 'Не удалось снять бан'));
      },
    });
  }
}
