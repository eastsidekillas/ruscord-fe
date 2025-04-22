import { Routes } from '@angular/router';
import { AuthGuard } from '@shared/guards/auth.guard';
import { ChannelPage } from '@pages/chat-id/ui/channel-id-page';
import {RelationshipsPage} from '@pages/friends-list/ui/relationships-page';

export const appRoutes: Routes = [


  {path: 'login', loadComponent: () => import('./auth/sign-in').then(m => m.SignIn) },
  {path: '', loadComponent: () => import('../shared/themes/LandingLayout').then(m => m.LandingLayout) },
  {path: 'invite/:token', loadComponent: () => import('../pages/invite-token/ui/invite-page').then(m => m.InvitePage) },

  {
    path: 'channels',
    canActivate: [AuthGuard],
    loadComponent: () => import('../shared/themes/MainLayout').then(m => m.MainLayout),
    children: [
      {
        path: 'me',
        children: [
          { path: '', component: RelationshipsPage },
          { path: ':channelId', component: ChannelPage },
        ],
      },
      {
        path: ':serverId/:channelId',
        component: ChannelPage,
      },
    ],
  },
];
