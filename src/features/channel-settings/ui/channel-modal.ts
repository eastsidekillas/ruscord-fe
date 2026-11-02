import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ModalService } from '@shared/model/modal.service';
import { ModalFrame } from '@shared/ui/modal-frame';
import { AppStateStore } from '@entities/app-state';
import { ChannelForm } from './channel-form';

/** «Создать канал» by the mockup (modal data: serverId, parentId?). */
@Component({
  selector: 'ChannelModal',
  standalone: true,
  imports: [ModalFrame, ChannelForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ModalFrame title="Создать канал" (closed)="close()">
      @if (guild(); as g) {
        <ChannelForm [guild]="g" [parent]="data['parentId'] ?? null" (done)="close()" (cancelled)="close()" />
      }
    </ModalFrame>
  `,
})
export class ChannelModal {
  private readonly modal = inject(ModalService);
  private readonly store = inject(AppStateStore);
  protected readonly data = this.modal.modalData();
  protected readonly guild = computed(() => this.store.guild(this.data['serverId']));

  protected close(): void {
    this.modal.close();
  }
}
