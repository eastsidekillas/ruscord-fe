import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { AppFrame } from '@widgets/app-frame/ui/app-frame';

@Component({
  selector: 'app-server-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppFrame, RouterOutlet],
  template: `<AppFrame [serverId]="serverId()"><router-outlet></router-outlet></AppFrame>`,
})
export class ServerLayout {
  protected readonly serverId = toSignal(inject(ActivatedRoute).paramMap.pipe(map(p => p.get('serverId'))), { initialValue: null });
}
