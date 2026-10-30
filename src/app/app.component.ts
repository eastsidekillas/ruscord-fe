import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { CreateServerModal } from '@features/create-server/ui/create-server-modal';
import { Notification } from '@shared/ui/notification';
import { NotificationService } from '@shared/model/notification.service';
import { ProfileViewModal } from '@features/view-profile/ui/profile-view-modal';
import { ModalService } from '@shared/model/modal.service';
import { InviteServerModal } from '@features/invite-server/ui/invite-server-modal';
import { ServerSettingsModal } from '@features/server-settings/ui/server-settings-modal';
import { UserSettingsModal } from '@widgets/user/ui/UserSettingsModal';
import { ConnectionOverlay } from '@shared/ui/connection-overlay';
import { AppStateStore, IdleService, TypingStore } from '@entities/app-state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CreateServerModal, Notification, NgIf, ProfileViewModal, InviteServerModal, ServerSettingsModal, UserSettingsModal, ConnectionOverlay],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet></router-outlet>

    <ConnectionOverlay></ConnectionOverlay>

    <CreateServerModal *ngIf="modalService.modalType() === 'createServer'"></CreateServerModal>
    <ProfileViewModal *ngIf="modalService.modalType() === 'userProfile'"></ProfileViewModal>
    <InviteServerModal *ngIf="modalService.modalType() === 'invite'"></InviteServerModal>
    <ServerSettingsModal *ngIf="modalService.modalType() === 'editServer'"></ServerSettingsModal>
    <UserSettingsModal *ngIf="modalService.modalType() === 'userSettings'"></UserSettingsModal>
    <Notification *ngIf="notificationService.state().visible"></Notification>
  `,
})
export class AppComponent {
  readonly notificationService = inject(NotificationService);
  readonly modalService = inject(ModalService);

  constructor() {
    // Created here so the gateway connects on sign-in and events are never missed.
    inject(AppStateStore);
    inject(TypingStore);
    inject(IdleService);
  }
}
