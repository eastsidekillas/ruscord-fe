import { Routes } from '@angular/router';
import { AuthGuard } from '@entities/session/guards/auth.guard';
import { ChannelPage } from '@pages/channel/ui/channel-page';
import { RelationshipsPage } from '@pages/relationships/ui/relationships-page';
import { TextChannelResolver } from '@pages/server-layout/model/text-channel.resolver';

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
        resolve: {
          fallbackTextChannel: TextChannelResolver
        },
        children: [
          { path: ':channelId', component: ChannelPage },
        ],
      },
    ],
  }
];
