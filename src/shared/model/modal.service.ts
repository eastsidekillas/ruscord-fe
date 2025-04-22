import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

export interface ModalData {
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  private modalTypeSubject = new BehaviorSubject<ModalType | null>(null);
  private modalDataSubject = new BehaviorSubject<ModalData>({});
  private isOpenSubject = new BehaviorSubject<boolean>(false);

  modalType$ = this.modalTypeSubject.asObservable();
  modalData$ = this.modalDataSubject.asObservable();
  isOpen$ = this.isOpenSubject.asObservable();

  open(type: ModalType, data: ModalData = {}) {
    this.modalTypeSubject.next(type);
    this.modalDataSubject.next(data);
    this.isOpenSubject.next(true);
  }

  close() {
    this.modalTypeSubject.next(null);
    this.modalDataSubject.next({});
    this.isOpenSubject.next(false);
  }
}
