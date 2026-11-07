import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppFrame } from '@widgets/app-frame/ui/app-frame';

@Component({
  selector: 'app-dm-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppFrame, RouterOutlet],
  template: `<AppFrame><router-outlet></router-outlet></AppFrame>`,
})
export class DmLayoutComponent {}
