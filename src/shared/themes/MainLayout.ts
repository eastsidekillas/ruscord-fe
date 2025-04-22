import { Component } from '@angular/core';
import { RouterOutlet, ActivatedRoute, Router, NavigationEnd, ParamMap } from '@angular/router';
import { ServerSidebar } from '@widgets/sidebar/ui/server-sidebar/server-sidebar';
import { Sidebar } from '@widgets/sidebar/ui/sidebar';
import { filter, map, startWith } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'MainLayout',
  standalone: true,
  imports: [
    Sidebar,
    ServerSidebar,
    RouterOutlet,
    AsyncPipe,
  ],
  template: `
    <div class="flex flex-col lg:flex-row h-screen">

      <ServerSidebar class="w-full lg:w-20 bg-sidebar-surface-primary flex lg:flex-col max-sm:hidden items-center py-4 lg:py-6"/>

      <Sidebar
        class="flex flex-col lg:w-64 bg-sidebar-surface-primary"
        [serverId]="serverId$ | async"
        [isServerRoute]="(isServerRoute$ | async) ?? false"
      />

      <div class="flex-1 flex flex-col bg-main-surface-primary">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
})
export class MainLayout {
  serverId$: Observable<string | null> | undefined;
  isServerRoute$: Observable<boolean>;

  constructor(private route: ActivatedRoute, private router: Router) {
    this.serverId$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.route.firstChild?.snapshot.paramMap.get('serverId') ?? null),
      startWith(this.route.snapshot.firstChild?.paramMap.get('serverId') ?? null)
    );


    // Явно получаем boolean значение
    this.isServerRoute$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => !!this.route.firstChild?.snapshot.paramMap.get('serverId')),
      startWith(!!this.route.snapshot.firstChild?.paramMap.get('serverId'))
    );
  }
}
