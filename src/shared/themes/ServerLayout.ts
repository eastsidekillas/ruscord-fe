import {Observable, of, switchMap} from 'rxjs';
import {map} from 'rxjs/operators';
import {AuthService} from '@shared/api/auth.service';
import {ApiService} from '@shared/api/api.service';
import {ActivatedRoute, RouterOutlet} from '@angular/router';
import {Sidebar} from '@widgets/sidebar/ui/sidebar';
import {ServerSidebar} from '@widgets/sidebar/ui/server-sidebar/server-sidebar';
import {AsyncPipe} from '@angular/common';
import {SidebarUserProfile} from '@widgets/sidebar/ui/sidebar-user-profile';
import {ServerMembersSidebar} from '@widgets/sidebar/ui/server-sidebar/server-members-sidebar';
import {Component} from '@angular/core';

@Component({
  selector: 'app-server-layout',
  standalone: true,
  imports: [
    Sidebar,
    ServerSidebar,
    RouterOutlet,
    AsyncPipe,
    SidebarUserProfile,
  ],
  template: `
    <div class="flex flex-col lg:flex-row h-screen relative">
      <ServerSidebar class="w-full lg:w-20 bg-sidebar-surface-primary flex lg:flex-col max-sm:hidden items-center py-4 lg:py-6" />
      <Sidebar
        class="flex flex-col lg:w-64 bg-sidebar-surface-primary"
        [serverId]="serverId$ | async"
        [serverName]="serverName$ | async"
        [isServerRoute]="true"
      />
      <div class="flex-1 flex flex-col bg-main-surface-primary">
        <router-outlet></router-outlet>
      </div>
      <div class="absolute bottom-4 lg:left-2 left-4 z-50 w-[calc(100%-2rem)] lg:w-80 max-sm:hidden">
        <SidebarUserProfile [username]="userName" [avatarUrl]="userAvatar" [userId]="userId" />
      </div>
    </div>
  `,
})
export class ServerLayout {
  serverId$!: Observable<string | null>;
  serverName$!: Observable<string | null>;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private auth: AuthService
  ) {
    this.serverId$ = this.route.paramMap.pipe(
      map(params => params.get('serverId'))
    );

    this.serverName$ = this.serverId$.pipe(
      switchMap(id =>
        id ? this.api.getServerDetails(id).pipe(map(res => res?.name ?? 'Сервер')) : of(null)
      )
    );
  }

  get userId() {
    return this.auth.currentUserValue?.user_id || '';
  }

  get userAvatar() {
    return this.auth.currentUserValue?.avatar || 'https://via.placeholder.com/150';
  }

  get userName() {
    return this.auth.currentUserValue?.name || 'Guest';
  }
}
