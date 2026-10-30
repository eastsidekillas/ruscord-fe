import { Routes } from '@angular/router';
import { AuthGuard } from '@entities/session/guards/auth.guard';
import { ChannelPage } from '@pages/channel/ui/channel-page';
import { RelationshipsPage } from '@pages/relationships/ui/relationships-page';
import { GuildHome } from '@pages/server-layout/ui/guild-home';

export const appRoutes: Routes = [
  { path: 'login', loadComponent: () => import('../pages/auth/ui/sign-in').then(m => m.SignIn) },
  { path: '', loadComponent: () => import('../pages/landing/ui/landing-page').then(m => m.LandingLayout) },
  { path: 'invite/:token', loadComponent: () => import('../pages/invite/ui/invite-page').then(m => m.InvitePage) },

  {
    path: 'channels',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'me',
        loadComponent: () => import('../pages/dm-layout/ui/dm-layout').then(m => m.DmLayoutComponent),
        children: [
          { path: '', component: RelationshipsPage },
          { path: ':channelId', component: ChannelPage },
        ],
      },
      {
        path: ':serverId',
        loadComponent: () => import('../pages/server-layout/ui/server-layout').then(m => m.ServerLayout),
        children: [
          { path: '', component: GuildHome },
          { path: ':channelId', component: ChannelPage },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
