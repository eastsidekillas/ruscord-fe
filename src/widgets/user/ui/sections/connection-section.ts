import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { VoiceService } from '@entities/voice';
import { Dolobeb } from '@shared/ui/dolobeb';
import { VoiceStats } from '@widgets/voice/ui/voice-stats';

/** «Соединение»: the call statistics, or a sleeping dolobeb outside a call. */
@Component({
  selector: 'ConnectionSection',
  standalone: true,
  imports: [VoiceStats, Dolobeb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section data-settings-connection aria-labelledby="connection-h" class="flex flex-col gap-5">
      <h1 id="connection-h" class="m-0 text-[20px] leading-7 font-semibold">Соединение</h1>
      @if (voice.connected()) {
        <VoiceStats />
      } @else {
        <div class="flex flex-col items-center gap-3 py-8 text-center">
          <Dolobeb state="sleeping" [size]="132" />
          <p class="m-0 text-ok-muted">Статистика появится во время звонка</p>
        </div>
      }
    </section>
  `,
})
export class ConnectionSectionComponent {
  protected readonly voice = inject(VoiceService);
}
