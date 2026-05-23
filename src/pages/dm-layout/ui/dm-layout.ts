import { inject } from '@angular/core';
import { AuthService } from '@entities/session/api/auth.service';
import { Sidebar } from '@widgets/sidebar/ui/sidebar';
import { RouterOutlet } from '@angular/router';
import { SidebarUserProfile } from '@widgets/sidebar/ui/sidebar-user-profile';
import { Component } from '@angular/core';
import { ServerSidebar } from '@widgets/sidebar/ui/server-sidebar/server-sidebar';

@Component({
  selector: 'app-dm-layout',
  standalone: true,
  imports: [Sidebar, RouterOutlet, SidebarUserProfile, ServerSidebar],
  template: `
    <div class="flex h-screen relative">
      <ServerSidebar class="w-full lg:w-20 bg-sidebar-surface-primary flex lg:flex-col max-sm:hidden items-center pt-2 pb-4 lg:pb-6" />
      <Sidebar
        class="flex flex-col w-64 bg-sidebar-surface-primary"
        [isServerRoute]="false"
      />
      <div class="flex-1 flex flex-col bg-main-surface-primary">
        <router-outlet></router-outlet>
      </div>
      <div class="absolute bottom-4 left-2 z-50 w-[calc(100%-2rem)] lg:w-80 max-sm:hidden">
        <SidebarUserProfile [username]="auth.userName" [avatarUrl]="auth.userAvatar" [userId]="auth.userId" />
      </div>
    </div>
  `,
})
export class DmLayoutComponent {
  protected readonly auth = inject(AuthService);
}
