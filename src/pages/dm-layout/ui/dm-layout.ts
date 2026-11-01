import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '@widgets/sidebar/ui/sidebar';
import { ServerSidebar } from '@widgets/sidebar/ui/server-sidebar/server-sidebar';

@Component({
  selector: 'app-dm-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sidebar, RouterOutlet, ServerSidebar],
  template: `
    <div class="flex h-screen overflow-hidden bg-ok-bg text-ok-text text-[15px]">
      <ServerSidebar />
      <Sidebar [isServerRoute]="false" />
      <main class="flex-1 flex flex-col min-w-0 bg-ok-surface-1">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class DmLayoutComponent {}
