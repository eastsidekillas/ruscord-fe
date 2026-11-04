import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { GripVertical, LucideAngularModule, Plus } from 'lucide-angular';
import { ApiService, FullGuild, PermGroups, Role, errorText } from '@shared/api';

/** Role colours of the mockup: the design system's warning, success, accent and danger. */
export const ROLE_COLORS: { value: number; label: string }[] = [
  { value: 0xE6C27A, label: 'Жёлтый' },
  { value: 0x7FD1A8, label: 'Зелёный' },
  { value: 0x7FB2E5, label: 'Голубой' },
  { value: 0xF08A80, label: 'Красный' },
];

export function colorHex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}

/**
 * Where a role lands when dropped on another: the target's position.
 * The server shifts the roles in between. @everyone (position 0) and the
 * same place are no move.
 */
export function moveTarget(from: Role, to: Role): number | null {
  if (to.position < 1 || from.position < 1 || from.id === to.id) return null;
  return to.position;
}

/**
 * «Роли» by the mockup: the list (highest first, drag or Alt+↑↓ to reorder),
 * name, colour, permissions by group and a bar for unsaved changes. The
 * server enforces the rules (a role below your highest, only bits you have);
 * a refusal shows its message. Roles come live from GUILD_ROLE_* events.
 */
@Component({
  selector: 'RolesTab',
  standalone: true,
  imports: [NgClass, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap min-h-full">
      <section aria-label="Список ролей" class="flex-[1_1_240px] max-w-[280px] px-4 py-12 box-border flex flex-col gap-1 border-r border-ok-border">
        <div class="flex items-center px-2 pb-2">
          <h1 class="m-0 flex-1 text-[20px] leading-7 font-semibold">Роли</h1>
          <button type="button" (click)="create()" [disabled]="busy()" aria-label="Создать роль" title="Создать роль"
                  class="w-9 h-9 rounded-lg bg-ok-surface-2 text-ok-text flex items-center justify-center disabled:opacity-50">
            <lucide-angular class="w-4 h-4" [img]="Plus" aria-hidden="true"></lucide-angular>
          </button>
        </div>
        <p class="mx-2 mb-2 text-[12px] text-ok-muted">Выше — важнее. Менять можно только роли ниже своей. Порядок — перетаскиванием или Alt+↑↓.</p>
        @for (r of roles(); track r.id) {
          <button type="button" (click)="select(r)" [attr.aria-current]="r.id === selectedId() ? 'true' : null"
                  [attr.draggable]="!isEveryone(r)" (dragstart)="dragId = r.id" (dragover)="$event.preventDefault()" (drop)="drop(r)"
                  (keydown.alt.arrowup)="$event.preventDefault(); step(r, 1)" (keydown.alt.arrowdown)="$event.preventDefault(); step(r, -1)"
                  class="flex items-center gap-2.5 p-2.5 rounded-[10px] text-left"
                  [ngClass]="r.id === selectedId() ? 'bg-ok-surface-2 text-ok-text' : isEveryone(r) ? 'text-ok-muted hover:bg-ok-surface-1' : 'text-ok-text hover:bg-ok-surface-1'">
            @if (isEveryone(r)) { <span class="w-3.5"></span> } @else {
              <lucide-angular class="w-3.5 h-3.5 text-ok-muted cursor-grab" [img]="Grip" aria-hidden="true"></lucide-angular>
            }
            <span class="w-3 h-3 rounded-[4px] shrink-0" [style.background]="r.color ? hex(r.color) : 'var(--color-ok-border-control)'"></span>
            <span class="flex-1 truncate">{{ label(r) }}</span>
            @if (isEveryone(r)) { <span class="text-[12px]">все</span> }
          </button>
        }
      </section>

      @if (selected(); as r) {
        <form class="flex-[999_1_480px] min-w-0 max-w-[760px] px-10 pt-12 pb-4 box-border flex flex-col gap-6" (ngSubmit)="save(r)">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="r-name" class="text-[13px] font-medium text-ok-muted">Название роли</label>
              <input id="r-name" name="roleName" [ngModel]="draftName()" (ngModelChange)="draftName.set($event)" [disabled]="isEveryone(r)" maxlength="100"
                     class="h-12 box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-4 disabled:opacity-60" />
            </div>
            <fieldset class="border-0 m-0 p-0 flex flex-col gap-1.5">
              <legend class="text-[13px] font-medium text-ok-muted pb-1.5">Цвет</legend>
              <div class="flex gap-2 items-center h-12">
                @for (c of swatches(); track c.value) {
                  <button type="button" (click)="draftColor.set(c.value)" [attr.aria-label]="c.label" [attr.aria-pressed]="draftColor() === c.value"
                          class="w-8 h-8 rounded-lg"
                          [style.background]="hex(c.value)"
                          [style.box-shadow]="draftColor() === c.value ? '0 0 0 2px var(--color-ok-bg), 0 0 0 4px var(--color-ok-text)' : null"></button>
                }
                <button type="button" (click)="draftColor.set(0)" aria-label="Без цвета" [attr.aria-pressed]="draftColor() === 0"
                        class="w-8 h-8 rounded-lg border border-ok-border-control bg-transparent"
                        [style.box-shadow]="draftColor() === 0 ? '0 0 0 2px var(--color-ok-bg), 0 0 0 4px var(--color-ok-text)' : null"></button>
              </div>
            </fieldset>
          </div>

          @if (!isEveryone(r)) {
            <label class="flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-ok-sidebar cursor-pointer">
              <span class="flex-1 flex flex-col">
                <span>Разрешить всем упоминать эту роль</span>
                <span class="text-[12px] text-ok-muted">Без этого роль упоминают только те, у кого есть «Упоминать &#64;everyone, &#64;here и все роли»</span>
              </span>
              <input type="checkbox" role="switch" class="w-[18px] h-[18px] accent-ok-accent" [checked]="draftMentionable()" (change)="draftMentionable.set(!draftMentionable())" />
            </label>
          }

          <div class="flex flex-col gap-5">
            @for (g of groups; track g.title) {
              <fieldset class="border-0 m-0 p-0 flex flex-col gap-0.5">
                <legend class="text-[12px] font-semibold tracking-[0.1em] text-ok-muted pb-2">{{ g.title }}</legend>
                @for (p of g.perms; track p.label) {
                  <label class="flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-ok-sidebar cursor-pointer">
                    <span class="flex-1">{{ p.label }}</span>
                    <input type="checkbox" role="switch" class="w-[18px] h-[18px] accent-ok-accent" [checked]="has(p.bit)" (change)="toggle(p.bit)" />
                  </label>
                }
              </fieldset>
            }
          </div>

          @if (!isEveryone(r)) {
            <div>
              <button type="button" (click)="remove(r)" [disabled]="busy()" class="h-10 px-4 rounded-[10px] bg-ok-surface-2 text-ok-danger font-semibold disabled:opacity-50">Удалить роль</button>
            </div>
          }

          @if (error()) { <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p> }

          @if (dirty()) {
            <div class="sticky bottom-4 flex items-center gap-3 px-4 py-3 rounded-[14px] bg-ok-surface-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex-wrap">
              <span class="flex-1 text-[13px]">Есть несохранённые изменения</span>
              <button type="button" (click)="select(r)" class="h-10 px-4 rounded-[10px] text-ok-text font-semibold">Сбросить</button>
              <button type="submit" [disabled]="busy()" class="h-10 px-4 rounded-[10px] bg-ok-accent text-ok-on-accent font-semibold disabled:opacity-50">Сохранить</button>
            </div>
          }
        </form>
      }
    </div>
  `,
})
export class RolesTab {
  readonly guild = input.required<FullGuild>();
  private readonly api = inject(ApiService);

  protected readonly groups = PermGroups;
  protected readonly Plus = Plus;
  protected readonly Grip = GripVertical;
  /** Highest first, like the role list in Discord. */
  protected readonly roles = computed(() => [...this.guild().roles].sort((a, b) => b.position - a.position));
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => this.roles().find(r => r.id === this.selectedId()) ?? null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly draftName = signal('');
  protected readonly draftColor = signal(0);
  protected readonly draftMentionable = signal(false);
  private readonly draftPerms = signal(0n);
  protected dragId: string | null = null;

  /** The palette, plus a role's own colour when it is not in it. */
  protected readonly swatches = computed(() => {
    const own = this.selected()?.color ?? 0;
    return own && !ROLE_COLORS.some(c => c.value === own) ? [...ROLE_COLORS, { value: own, label: 'Свой цвет' }] : ROLE_COLORS;
  });

  protected readonly dirty = computed(() => {
    const r = this.selected();
    if (!r) return false;
    return this.draftPerms() !== BigInt(r.permissions || '0')
      || this.draftColor() !== (r.color || 0)
      || (!this.isEveryone(r) && this.draftMentionable() !== !!r.mentionable)
      || (!this.isEveryone(r) && this.draftName().trim() !== r.name);
  });

  constructor() {
    // Open the first role when none is chosen. A role just created may not
    // be in the list yet (its event comes after the answer): keep its id.
    effect(() => {
      const list = this.roles();
      untracked(() => {
        if (!this.selectedId() && list.length) this.select(list[0]);
      });
    });
  }

  /** The @everyone role has the guild's id. */
  protected isEveryone(r: Role): boolean { return r.id === this.guild().id; }
  protected label(r: Role): string { return this.isEveryone(r) ? '@everyone' : r.name; }
  protected hex(c: number): string { return colorHex(c); }

  protected select(r: Role): void {
    this.selectedId.set(r.id);
    this.error.set(null);
    this.draftName.set(r.name);
    this.draftColor.set(r.color || 0);
    this.draftMentionable.set(!!r.mentionable);
    this.draftPerms.set(BigInt(r.permissions || '0'));
  }

  protected has(bit: bigint): boolean { return (this.draftPerms() & bit) === bit; }
  protected toggle(bit: bigint): void { this.draftPerms.update(p => p ^ bit); }

  protected create(): void {
    this.run(this.api.createRole(this.guild().id, { name: 'Новая роль' }), (r: Role) => this.select(r));
  }

  protected save(r: Role): void {
    const patch: { name?: string; permissions: string; color: number; mentionable?: boolean } = {
      permissions: this.draftPerms().toString(),
      color: this.draftColor(),
    };
    if (!this.isEveryone(r)) patch.mentionable = this.draftMentionable();
    const name = this.draftName().trim();
    if (!this.isEveryone(r) && name && name !== r.name) patch.name = name;
    this.run(this.api.updateRole(this.guild().id, r.id, patch), (updated: Role) => this.select(updated));
  }

  protected remove(r: Role): void {
    if (!confirm(`Удалить роль «${r.name}»? Она пропадёт у всех участников.`)) return;
    this.run(this.api.deleteRole(this.guild().id, r.id), () => this.selectedId.set(null));
  }

  protected drop(to: Role): void {
    const from = this.roles().find(r => r.id === this.dragId);
    this.dragId = null;
    if (from) this.move(from, moveTarget(from, to));
  }

  /** One place up (+1) or down (-1), not below the lowest role above @everyone. */
  protected step(r: Role, by: 1 | -1): void {
    const top = this.roles().length - 1;
    const pos = r.position + by;
    if (this.isEveryone(r) || pos < 1 || pos > top) return;
    this.move(r, pos);
  }

  private move(r: Role, position: number | null): void {
    if (position === null || position === r.position) return;
    this.run(this.api.updateRole(this.guild().id, r.id, { position }), () => undefined);
  }

  private run<T>(req: Observable<T>, done: (v: T) => void): void {
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
