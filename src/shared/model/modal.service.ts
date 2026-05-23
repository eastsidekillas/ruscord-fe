import { Injectable, signal } from '@angular/core';

export type ModalType =
  | 'createServer'
  | 'invite'
  | 'editServer'
  | 'users'
  | 'createChannel'
  | 'leaveServer'
  | 'deleteServer'
  | 'deleteChannel'
  | 'editChannel'
  | 'messageAttachment'
  | 'deleteMessage'
  | 'userProfile'
  | 'userSettings'
  | 'incomingCall'

export interface ModalData {
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  modalType = signal<ModalType | null>(null);
  modalData = signal<ModalData>({});

  open(type: ModalType, data: ModalData = {}) {
    this.modalData.set(data);
    this.modalType.set(type);
  }

  close() {
    this.modalType.set(null);
    this.modalData.set({});
  }
}
