import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallStateService } from '@entities/call';
import { AvatarUI } from '@shared/ui/avatar';

@Component({
  selector: 'IncomingCallModal',
  standalone: true,
  imports: [CommonModule, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 flex items-center justify-center z-50">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <div class="relative bg-main-surface-primary rounded-2xl shadow-2xl w-80 p-8 flex flex-col items-center gap-5">

        <!-- Pulsating avatar -->
        <div class="relative flex items-center justify-center">
          <span class="absolute w-28 h-28 rounded-full bg-green-500/20 animate-ping"></span>
          <span class="absolute w-24 h-24 rounded-full bg-green-500/10 animate-ping" style="animation-delay:.25s"></span>
          <div class="relative w-20 h-20 rounded-full overflow-hidden border-4 border-green-500 z-10">
            <AvatarUI [src]="call.party()?.avatar" [name]="call.party()?.name ?? ''" />
          </div>
        </div>

        <!-- Info -->
        <div class="text-center">
          <p class="text-white text-xl font-semibold">{{ call.party()?.name }}</p>
          <p class="text-gray-400 text-sm mt-1">Входящий звонок...</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-8 mt-2">
          <!-- Decline -->
          <button
            (click)="call.declineCall()"
            class="flex flex-col items-center gap-1 group"
          >
            <span class="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition shadow-lg">
              <svg class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.693 16.013H7.31a1.685 1.685 0 0 0 1.685-1.684v-.645A1.684 1.684 0 0 1 10.679 12h2.647a1.686 1.686 0 0 1 1.686 1.686v.646c0 .446.178.875.494 1.19.316.317.693.495 1.14.495h1.685a1.556 1.556 0 0 0 1.597-1.016c.078-.214.107-.776.088-1.002.014-4.415-3.571-6.003-8-6.004-4.427 0-8.014 1.585-8.01 5.996-.02.227.009.79.087 1.003a1.558 1.558 0 0 0 1.6 1.02Z"/>
              </svg>
            </span>
            <span class="text-xs text-gray-400 group-hover:text-white transition">Отклонить</span>
          </button>

          <!-- Accept -->
          <button
            (click)="call.acceptCall()"
            class="flex flex-col items-center gap-1 group"
          >
            <span class="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition shadow-lg">
              <svg class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.97825 3.99999c-.3729 0-.74128.08169-1.07926.23933-.32394.1511-.61243.36846-.84696.63787-1.81892 1.82189-2.35302 3.87423-1.89899 5.93671.43916 1.9949 1.77747 3.8929 3.45642 5.572 1.67897 1.6791 3.57614 3.0176 5.57034 3.4591 2.0612.4563 4.1141-.0726 5.9396-1.8853.2705-.2348.4888-.524.6405-.8489.1581-.3387.2401-.7081.2401-1.0819 0-.3739-.082-.7432-.2401-1.0819-.1516-.3247-.3696-.6137-.6398-.8483l-1.2098-1.2106c-.5043-.5041-1.1879-.7872-1.9007-.7872-.7128 0-1.3968.2835-1.9011.7876l-.6178.6181c-.1512.1513-.3563.2363-.5701.2363-.2138 0-.4189-.085-.5701-.2363l-1.85336-1.8545c-.15117-.1513-.23609-.3565-.23609-.5704 0-.214.08493-.4192.23613-.5705l.61812-.61851c.5037-.50461.7867-1.18868.7867-1.90191s-.2833-1.39767-.7871-1.90228L8.90499 4.8778c-.23462-.26969-.5233-.48727-.84749-.63848-.33798-.15764-.70636-.23933-1.07925-.23933Z"/>
              </svg>
            </span>
            <span class="text-xs text-gray-400 group-hover:text-white transition">Принять</span>
          </button>
        </div>

      </div>
    </div>
  `,
})
export class IncomingCallModal {
  protected readonly call = inject(CallStateService);
}
