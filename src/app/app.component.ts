import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { CreateServerModal } from '@features/create-server/ui/create-server-modal';
import { Notification } from '@shared/ui/notification';
import { NotificationService } from '@shared/model/notification.service';
import { ProfileViewModal } from '@features/view-profile/ui/profile-view-modal';
import { ModalService } from '@shared/model/modal.service';
import { InviteServerModal } from '@features/invite-server/ui/invite-server-modal';
import { UserSettingsModal } from '@widgets/user/ui/UserSettingsModal';
import { IncomingCallModal } from '@features/incoming-call/ui/incoming-call-modal';
import { ForwardMessageModal } from '@features/forward-message/ui/forward-message-modal';
import { CallStateService } from '@entities/call';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CreateServerModal, Notification, NgIf, ProfileViewModal, InviteServerModal, UserSettingsModal, IncomingCallModal, ForwardMessageModal],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet></router-outlet>

    <CreateServerModal *ngIf="modalService.modalType() === 'createServer'"></CreateServerModal>
    <ProfileViewModal *ngIf="modalService.modalType() === 'userProfile'"></ProfileViewModal>
    <InviteServerModal *ngIf="modalService.modalType() === 'invite'"></InviteServerModal>
    <UserSettingsModal *ngIf="modalService.modalType() === 'userSettings'"></UserSettingsModal>
    <IncomingCallModal *ngIf="modalService.modalType() === 'incomingCall'"></IncomingCallModal>
    <ForwardMessageModal *ngIf="modalService.modalType() === 'forwardMessage'"></ForwardMessageModal>
    <Notification *ngIf="notificationService.state().visible"></Notification>
  `,
})
export class AppComponent {
  // Eagerly instantiate CallStateService so it subscribes to socket messages from app start
  constructor(
    public notificationService: NotificationService,
    public modalService: ModalService,
    _call: CallStateService,
  ) {}
}
