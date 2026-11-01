import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { Sidebar } from '@widgets/sidebar/ui/sidebar';
import { ServerSidebar } from '@widgets/sidebar/ui/server-sidebar/server-sidebar';
import { AppStateStore } from '@entities/app-state';

@Component({
  selector: 'app-server-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sidebar, ServerSidebar, RouterOutlet],
  template: `
    <div class="flex h-screen overflow-hidden bg-ok-bg text-ok-text text-[15px]">
      <ServerSidebar />
      <Sidebar [serverId]="serverId()" [isServerRoute]="true" />
      <main class="flex-1 flex flex-col min-w-0 bg-ok-surface-1">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class ServerLayout {
  protected readonly store = inject(AppStateStore);
  protected readonly serverId = toSignal(inject(ActivatedRoute).paramMap.pipe(map(p => p.get('serverId'))), { initialValue: null });
  protected readonly guild = computed(() => this.store.guild(this.serverId()));
}
