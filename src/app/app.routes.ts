import { Routes } from '@angular/router';
import { AuthGuard } from '@shared/guards/auth.guard';
import { ChannelPage } from '@pages/chat-id/ui/channel-id-page';
import {RelationshipsPage} from '@pages/friends-list/ui/relationships-page';
import {ServerMediaRoom} from '@widgets/sidebar/ui/server-sidebar/server-media-room';
import {TextChannelResolver} from '@shared/model/text-channel.resolver';

export const appRoutes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/sign-in').then(m => m.SignIn) },
  { path: '', loadComponent: () => import('../shared/themes/LandingLayout').then(m => m.LandingLayout) },
  { path: 'invite/:token', loadComponent: () => import('../pages/invite-token/ui/invite-page').then(m => m.InvitePage) },

  {
    path: 'channels',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'me',
        loadComponent: () => import('../shared/themes/DMLayout').then(m => m.DmLayoutComponent),
        children: [
          { path: '', component: RelationshipsPage },
          { path: ':channelId', component: ChannelPage },
        ],
      },
      // Обработать серверные каналы через конкретный serverId
      {
        path: ':serverId',
        loadComponent: () => import('../shared/themes/ServerLayout').then(m => m.ServerLayout),
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

