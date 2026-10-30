import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { Sidebar } from '@widgets/sidebar/ui/sidebar';
import { ServerSidebar } from '@widgets/sidebar/ui/server-sidebar/server-sidebar';
import { SidebarUserProfile } from '@widgets/sidebar/ui/sidebar-user-profile';
import { AppStateStore } from '@entities/app-state';

@Component({
  selector: 'app-server-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sidebar, ServerSidebar, RouterOutlet, SidebarUserProfile],
  template: `
    <div class="flex flex-col lg:flex-row h-screen relative">
      <ServerSidebar class="w-full lg:w-20 bg-sidebar-surface-primary flex lg:flex-col max-sm:hidden items-center pt-2 pb-4 lg:pb-6" />
      <Sidebar
        class="flex flex-col lg:w-64 bg-sidebar-surface-primary"
        [serverId]="serverId()"
        [isServerRoute]="true"
      />
      <div class="flex-1 flex flex-col bg-main-surface-primary min-w-0">
        <router-outlet></router-outlet>
      </div>
      <div class="absolute bottom-4 left-2 z-50 w-[calc(100%-2rem)] lg:w-80 max-sm:hidden">
        <SidebarUserProfile />
      </div>
    </div>
  `,
})
export class ServerLayout {
  protected readonly store = inject(AppStateStore);
  protected readonly serverId = toSignal(inject(ActivatedRoute).paramMap.pipe(map(p => p.get('serverId'))), { initialValue: null });
  protected readonly guild = computed(() => this.store.guild(this.serverId()));
}
