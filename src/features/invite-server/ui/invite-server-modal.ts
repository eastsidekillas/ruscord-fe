import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ModalService } from '@shared/model/modal.service';
import { ModalFrame } from '@shared/ui/modal-frame';
import { AppStateStore } from '@entities/app-state';
import { InviteCreator } from './invite-creator';

/** «Пригласить людей» from the server menu (modal data: serverId, channelId). */
@Component({
  selector: 'InviteServerModal',
  standalone: true,
  imports: [ModalFrame, InviteCreator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ModalFrame title="Пригласить своих" [wide]="true" (closed)="modal.close()">
      @if (guild(); as g) {
        <InviteCreator [guild]="g" [preferChannel]="data['channelId'] ?? null" />
      } @else {
        <p class="m-0 text-[13px] text-ok-muted">Сервер недоступен.</p>
      }
    </ModalFrame>
  `,
})
export class InviteServerModal {
  protected readonly modal = inject(ModalService);
  private readonly store = inject(AppStateStore);
  protected readonly data = this.modal.modalData();
  protected readonly guild = computed(() => this.store.guild(this.data['serverId']));
}
