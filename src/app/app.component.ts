import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {CreateServerModal} from '@features/update-server/ui/create-server-modal';
import {Notification} from '@shared/ui/notification';
import {AsyncPipe, NgIf} from '@angular/common';
import {NotificationService} from '@shared/model/notification.service';
import {ProfileViewModal} from '@features/view-profile/ui/profile-view-modal';
import {ModalService} from '@shared/model/modal.service';
import {InviteServerModal} from '@features/update-server/ui/invite-server-modal';
import {UserSettingsModal} from '@widgets/user/ui/UserSettingsModal';
import {IncomingCallModal} from '@features/update-message/ui/incoming-call-modal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CreateServerModal, Notification, NgIf, ProfileViewModal, AsyncPipe, InviteServerModal, UserSettingsModal, IncomingCallModal],
  standalone: true,
  template:
    `<router-outlet></router-outlet>

    <CreateServerModal *ngIf="(modalService.modalType$ | async) === 'createServer'"></CreateServerModal>
    <ProfileViewModal *ngIf="(modalService.modalType$ | async) === 'userProfile'"></ProfileViewModal>
    <InviteServerModal *ngIf="(modalService.modalType$ | async) === 'invite'"></InviteServerModal>
    <UserSettingsModal *ngIf="(modalService.modalType$ | async)=== 'userSettings'"></UserSettingsModal>
    <IncomingCallModal *ngIf="(modalService.modalType$ | async)=== 'incomingCall'"></IncomingCallModal>
    <Notification *ngIf="notificationService.notificationVisible()"></Notification>

    `,

})
export class AppComponent {
  constructor(public notificationService: NotificationService, public modalService: ModalService) {}
}
