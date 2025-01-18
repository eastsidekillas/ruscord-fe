import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-call',
  templateUrl: './call.component.html',
  styleUrls: ['./call.component.css']
})
export class CallComponent {
  @Output() callEnded = new EventEmitter<void>(); // Для уведомления об окончании звонка

  micMuted: boolean = false;
  soundOff: boolean = false;

  toggleMic(): void {
    this.micMuted = !this.micMuted;
  }

  toggleSound(): void {
    this.soundOff = !this.soundOff;
  }

  endCall(): void {
    this.callEnded.emit();
  }
}
