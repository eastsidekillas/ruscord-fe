import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatItem } from './chat-item';

@Component({
  selector: 'ChatMessages',
  standalone: true,
  imports: [CommonModule, ChatItem],
  template: `
    <div
      class="h-full overflow-y-auto p-4 space-y-4 scroll-smooth scrollbar-thin scrollbar-thumb-green-500 scrollbar-track-main-surface-secondary"
      #messagesContainer
    >


      <ChatItem class="flex items-start space-x-3 px-2" *ngFor="let msg of messages" [msg]="msg" />
    </div>
  `,
})
export class ChatMessages implements AfterViewInit, OnDestroy {
  @Input() messages: any[] = [];
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  private observer: MutationObserver | null = null;
  private initialScrollDone = false;

  ngAfterViewInit() {
    this.scrollToBottom(false); // не анимированно, просто прыгаем
    this.observeMutations();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  observeMutations() {
    this.observer = new MutationObserver(() => {
      // Только если уже был первый скролл (то есть не при первом рендере)
      if (this.initialScrollDone) {
        this.scrollToBottom(true); // плавно
      }
    });

    if (this.messagesContainer) {
      this.observer.observe(this.messagesContainer.nativeElement, {
        childList: true,
      });
    }
  }

  scrollToBottom(smooth: boolean = true): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTo({
          top: el.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        });
        this.initialScrollDone = true;
      }
    }, 50); // чуть меньше, чтобы быстрее сработало
  }
}

