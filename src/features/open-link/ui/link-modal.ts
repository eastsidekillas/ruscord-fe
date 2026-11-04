import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ModalService } from '@shared/model/modal.service';
import { ModalFrame } from '@shared/ui/modal-frame';

/**
 * Asks before opening a link whose text is not its address (modal data:
 * url): the text of [текст](адрес) can name any site.
 */
@Component({
  selector: 'LinkModal',
  standalone: true,
  imports: [ModalFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ModalFrame title="Переход по ссылке" subtitle="Ссылка ведёт на другой сайт. Проверьте адрес, прежде чем переходить." (closed)="close()">
      <p class="m-0 rounded-ok-md bg-ok-sidebar border border-ok-border px-3.5 py-3 text-[13px] break-all">
        <span class="text-ok-muted">{{ scheme }}</span><span class="font-semibold text-ok-text">{{ host }}</span><span class="text-ok-muted">{{ rest }}</span>
      </p>
      <div class="flex gap-2 justify-end">
        <button type="button" (click)="close()" class="h-11 px-4 rounded-ok-md bg-ok-surface-2 text-ok-text font-semibold">Отмена</button>
        <a [href]="url" target="_blank" rel="noopener noreferrer nofollow" (click)="close()"
           class="h-11 px-4 rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold flex items-center">Перейти</a>
      </div>
    </ModalFrame>
  `,
})
export class LinkModal {
  private readonly modal = inject(ModalService);
  protected readonly url: string = this.modal.modalData()['url'] ?? '';
  private readonly parsed = safeURL(this.url);
  protected readonly scheme = this.parsed ? this.parsed.protocol + '//' : '';
  protected readonly host = this.parsed?.host ?? this.url;
  protected readonly rest = this.parsed ? this.url.slice(this.scheme.length + this.parsed.host.length) : '';

  protected close(): void {
    this.modal.close();
  }
}

function safeURL(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
