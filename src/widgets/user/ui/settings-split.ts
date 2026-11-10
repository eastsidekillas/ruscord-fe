import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Settings content with an optional live preview column that drops below on a narrow screen. */
@Component({
  selector: 'SettingsSplit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-start gap-6">
      <div class="flex-[999_1_360px] min-w-0"><ng-content /></div>
      <aside class="flex-[1_1_280px] max-w-[320px] box-border bg-ok-surface-1 rounded-ok-lg p-4">
        <ng-content select="[preview]" />
      </aside>
    </div>
  `,
})
export class SettingsSplit {}
