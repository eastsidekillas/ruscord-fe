import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '@widgets/sidebar/ui/sidebar';
import { SidebarFooter } from '@widgets/sidebar/ui/sidebar-footer';
import { ServerSidebar } from '@widgets/sidebar/ui/server-sidebar/server-sidebar';

@Component({
  selector: 'app-dm-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sidebar, RouterOutlet, SidebarFooter, ServerSidebar],
  template: `
    <div class="flex h-screen relative">
      <ServerSidebar class="w-full lg:w-20 bg-sidebar-surface-primary flex lg:flex-col max-sm:hidden items-center pt-2 pb-4 lg:pb-6" />
      <Sidebar class="flex flex-col w-64 bg-sidebar-surface-primary" [isServerRoute]="false" />
      <div class="flex-1 flex flex-col bg-main-surface-primary min-w-0">
        <router-outlet></router-outlet>
      </div>
      <SidebarFooter />
    </div>
  `,
})
export class DmLayoutComponent {}
