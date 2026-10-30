import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { NgIf } from '@angular/common';
import { AppStateStore, firstTextChannel } from '@entities/app-state';

/** /channels/:serverId opens the first text channel the user can see. */
@Component({
  selector: 'GuildHome',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf],
  host: { class: 'flex-1 flex items-center justify-center' },
  template: `
    <p *ngIf="store.loaded()" class="text-typo-secondary text-sm">
      {{ guild() ? 'На сервере нет текстовых каналов, которые вам видны.' : 'Сервер не найден или вы больше не участник.' }}
    </p>
  `,
})
export class GuildHome {
  protected readonly store = inject(AppStateStore);
  private readonly router = inject(Router);
  private readonly serverId = toSignal(inject(ActivatedRoute).parent!.paramMap.pipe(map(p => p.get('serverId'))), { initialValue: null });
  protected readonly guild = computed(() => this.store.guild(this.serverId()));

  constructor() {
    effect(() => {
      const g = this.guild();
      const ch = g && firstTextChannel(g);
      if (ch) this.router.navigate(['/channels', g.id, ch.id], { replaceUrl: true });
    });
  }
}
