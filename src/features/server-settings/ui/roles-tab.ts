import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, FullGuild, PermLabels, Role, errorText } from '@shared/api';

/**
 * Roles of a guild: create, rename, recolour, permissions, delete. The
 * server enforces the rules (a role below your highest, only bits you have);
 * a refusal shows its message. Roles come live from GUILD_ROLE_* events.
 */
@Component({
  selector: 'RolesTab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex gap-4 min-h-[320px]">
      <div class="w-44 shrink-0 flex flex-col gap-1">
        <button *ngFor="let r of roles(); trackBy: byId" type="button" (click)="select(r)"
                class="text-left text-sm px-2 py-1.5 rounded-lg truncate"
                [ngClass]="r.id === selectedId() ? 'bg-main-surface-secondary text-white' : 'text-gray-300 hover:bg-white/5'">
          <span class="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" [style.background]="hex(r.color)"></span>{{ label(r) }}
        </button>
        <form class="flex gap-1 mt-2" (ngSubmit)="create()">
          <input name="newRole" [(ngModel)]="newName" maxlength="100" placeholder="Новая роль"
                 class="min-w-0 flex-1 px-2 py-1 text-sm rounded-lg bg-main-surface-secondary border border-gray-700 focus:outline-none" />
          <button type="submit" [disabled]="busy() || !newName.trim()" class="px-2 text-sm text-green-400 disabled:opacity-40">+</button>
        </form>
      </div>

      <div *ngIf="selected() as r; else pick" class="flex-1 min-w-0 flex flex-col gap-3">
        <div class="flex gap-2 items-end">
          <label class="flex-1 flex flex-col gap-1 text-sm">
            <span class="text-typo-secondary">Название</span>
            <input name="roleName" [(ngModel)]="draftName" [disabled]="isEveryone(r)" maxlength="100"
                   class="px-3 py-1.5 rounded-lg bg-main-surface-secondary border border-gray-700 focus:outline-none disabled:opacity-50" />
          </label>
          <label class="flex flex-col gap-1 text-sm">
            <span class="text-typo-secondary">Цвет</span>
            <input type="color" name="roleColor" [(ngModel)]="draftColor" class="h-9 w-12 bg-transparent" />
          </label>
        </div>
        <div class="flex-1 overflow-y-auto max-h-64 pr-1 flex flex-col gap-1">
          <label *ngFor="let p of perms" class="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" [checked]="has(p.bit)" (change)="toggle(p.bit)" />
            {{ p.label }}
          </label>
        </div>
        <p *ngIf="error()" class="text-red-400 text-sm">{{ error() }}</p>
        <div class="flex items-center gap-2">
          <button *ngIf="!isEveryone(r)" type="button" (click)="remove(r)" [disabled]="busy()"
                  class="text-sm text-red-400 hover:underline disabled:opacity-50">Удалить роль</button>
          <span class="flex-1"></span>
          <button type="button" (click)="save(r)" [disabled]="busy()"
                  class="px-4 py-1.5 bg-green-500 text-sm rounded-lg hover:bg-green-600 disabled:opacity-50">Сохранить</button>
        </div>
      </div>
      <ng-template #pick><p class="flex-1 text-sm text-typo-secondary">Выберите роль слева.</p></ng-template>
    </div>
  `,
})
export class RolesTab {
  readonly guild = input.required<FullGuild>();
  private readonly api = inject(ApiService);

  protected readonly perms = PermLabels;
  /** Highest first, like the role list in Discord. */
  protected readonly roles = computed(() => [...this.guild().roles].sort((a, b) => b.position - a.position));
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => this.roles().find(r => r.id === this.selectedId()) ?? null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected newName = '';
  protected draftName = '';
  protected draftColor = '#000000';
  private draftPerms = 0n;

  protected byId = (_: number, r: Role) => r.id;
  /** The @everyone role has the guild's id. */
  protected isEveryone(r: Role): boolean { return r.id === this.guild().id; }
  protected label(r: Role): string { return this.isEveryone(r) ? '@everyone' : r.name; }
  protected hex(c: number): string { return c ? '#' + c.toString(16).padStart(6, '0') : '#99aab5'; }

  protected select(r: Role): void {
    this.selectedId.set(r.id);
    this.error.set(null);
    this.draftName = r.name;
    this.draftColor = '#' + (r.color || 0).toString(16).padStart(6, '0');
    this.draftPerms = BigInt(r.permissions || '0');
  }

  protected has(bit: bigint): boolean { return (this.draftPerms & bit) === bit; }
  protected toggle(bit: bigint): void { this.draftPerms ^= bit; }

  protected create(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.run(this.api.createRole(this.guild().id, { name }), (r: Role) => {
      this.newName = '';
      this.select(r);
    });
  }

  protected save(r: Role): void {
    const patch: { name?: string; permissions: string; color: number } = {
      permissions: this.draftPerms.toString(),
      color: parseInt(this.draftColor.slice(1), 16) || 0,
    };
    if (!this.isEveryone(r) && this.draftName.trim() !== r.name) patch.name = this.draftName.trim();
    this.run(this.api.updateRole(this.guild().id, r.id, patch), (updated: Role) => this.select(updated));
  }

  protected remove(r: Role): void {
    if (!confirm(`Удалить роль «${r.name}»? Она пропадёт у всех участников.`)) return;
    this.run(this.api.deleteRole(this.guild().id, r.id), () => this.selectedId.set(null));
  }

  private run<T>(req: import('rxjs').Observable<T>, done: (v: T) => void): void {
    this.busy.set(true);
    this.error.set(null);
    req.subscribe({
      next: v => {
        this.busy.set(false);
        done(v);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorText(err, 'Не удалось сохранить роль'));
      },
    });
  }
}
