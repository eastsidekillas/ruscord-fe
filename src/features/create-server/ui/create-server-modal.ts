import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus } from 'lucide-angular';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { ApiService, errorText } from '@shared/api';
import { ModalFrame } from '@shared/ui/modal-frame';
import { AppStateStore } from '@entities/app-state';

/** «Создать сервер» by the mockup: icon, name, Cancel and Create. */
@Component({
  selector: 'CreateServerModal',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, ModalFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ModalFrame title="Создать сервер" subtitle="Место для своей компании. Текстовый и голосовой канал появятся сразу." (closed)="closeModal()">
      <form class="flex flex-col gap-5" (ngSubmit)="onCreateServer()">
        <label for="avatar" class="self-center w-24 h-24 rounded-ok-lg overflow-hidden cursor-pointer flex flex-col items-center justify-center gap-1 text-[12px] text-ok-muted hover:text-ok-text"
               [class]="avatarPreviewUrl() ? '' : 'border border-dashed border-ok-border-control'">
          @if (avatarPreviewUrl(); as url) {
            <img [src]="url" alt="Иконка сервера" class="w-full h-full object-cover" />
          } @else {
            <lucide-angular class="w-[22px] h-[22px]" [img]="Plus" aria-hidden="true"></lucide-angular>
            Иконка
          }
          <input type="file" id="avatar" (change)="onFileSelected($event)" accept="image/png,image/jpeg,image/webp,image/gif" class="sr-only-ok" />
        </label>

        <div class="flex flex-col gap-1.5">
          <label for="channelName" class="text-[13px] font-medium text-ok-muted">Название</label>
          <input id="channelName" name="channelName" required type="text" maxlength="100" [(ngModel)]="serverName"
                 [attr.aria-invalid]="errorMessage() ? 'true' : null"
                 class="h-12 box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-4" />
          @if (errorMessage()) { <span role="alert" class="text-[13px] text-ok-danger">{{ errorMessage() }}</span> }
        </div>

        <div class="flex gap-2 justify-end">
          <button type="button" (click)="closeModal()" class="h-11 px-[18px] rounded-ok-md bg-ok-surface-2 text-ok-text font-semibold">Отмена</button>
          <button type="submit" [disabled]="creating()" class="h-11 px-[18px] rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold disabled:opacity-50">Создать</button>
        </div>
      </form>
    </ModalFrame>
  `,
})
export class CreateServerModal {
  serverName = '';
  readonly errorMessage = signal('');
  readonly avatarPreviewUrl = signal<string | null>(null);
  readonly creating = signal(false);
  private selectedFile: File | null = null;
  protected readonly Plus = Plus;

  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  readonly modalService = inject(ModalService);

  /** Creates the guild, then uploads the icon; a failed icon does not undo the guild. */
  onCreateServer() {
    const name = this.serverName.trim();
    if (name.length < 2 || name.length > 100) {
      this.errorMessage.set('Название — от 2 до 100 символов.');
      return;
    }
    if (this.creating()) return;
    this.creating.set(true);
    this.api.createGuild(name).subscribe({
      next: guild => {
        this.store.noteGuild(guild);
        if (this.selectedFile) {
          this.api.setGuildIcon(guild.id, this.selectedFile).subscribe({
            error: err => this.notify.show(errorText(err, 'Сервер создан, но иконку загрузить не удалось'), 'error'),
          });
        }
        this.closeModal();
        this.router.navigate(['/channels', guild.id]);
      },
      error: err => {
        this.creating.set(false);
        this.errorMessage.set(errorText(err, 'Не удалось создать сервер. Попробуйте ещё раз.'));
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 8 << 20) {
      this.errorMessage.set('Файл больше 8 МиБ.');
      return;
    }
    this.revokePreview();
    this.selectedFile = file;
    this.avatarPreviewUrl.set(URL.createObjectURL(file));
    this.errorMessage.set('');
  }

  closeModal() {
    this.revokePreview();
    this.modalService.close();
  }

  private revokePreview(): void {
    const url = this.avatarPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.avatarPreviewUrl.set(null);
  }
}
