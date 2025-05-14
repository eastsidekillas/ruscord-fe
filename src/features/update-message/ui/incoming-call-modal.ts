import {Component, Input} from '@angular/core';
import {ModalService} from '@shared/model/modal.service';
import {SocketService} from '@shared/api/socket.service';

@Component({
  selector: 'IncomingCallModal',
  template: `
    <div class="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div class="relative bg-main-surface-primary p-6 rounded-xl shadow-xl w-96 text-center">
        <p class="text-lg font-semibold mb-4">Входящий звонок</p>
        <p class="text-lg font-semibold mb-4">{{ fromUserId }}</p>
        <div class="flex justify-around">
          <button (click)="acceptCall()" class="px-4 py-2 bg-green-500 text-sm rounded-xl text-white hover:bg-green-600 transition">Принять</button>
          <button (click)="declineCall()" class="px-4 py-2 bg-red-500 text-sm rounded-xl text-white hover:bg-red-600 transition">Отклонить</button>
        </div>
      </div>
    </div>
  `,
  standalone: true,
})
export class IncomingCallModal {
  @Input() fromUserId!: string;
  @Input() channelId!: string;
  @Input() senderId!: number;

  constructor(private modalService: ModalService, private socketService: SocketService) {}

  acceptCall() {
    this.socketService.send({
      type: 'call.response',
      accepted: true,
      senderId: this.senderId
    });
    this.modalService.close();
  }

  declineCall() {
    this.socketService.send({
      type: 'call.response',
      accepted: false,  // Для отклонения передаем false
      senderId: this.senderId
    });
    this.modalService.close();
  }


}
