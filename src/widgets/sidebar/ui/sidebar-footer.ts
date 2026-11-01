import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SidebarUserProfile } from '@widgets/sidebar/ui/sidebar-user-profile';
import { VoicePanel } from '@widgets/voice/ui/voice-panel';

/**
 * The bottom of the sidebars on every page: the voice connection, while
 * there is one, above the user panel. Both layouts use it, so leaving a
 * server page does not hide the call.
 */
@Component({
  selector: 'SidebarFooter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SidebarUserProfile, VoicePanel],
  template: `
    <div class="absolute bottom-4 left-2 z-50 w-[calc(100%-2rem)] lg:w-80 max-sm:hidden flex flex-col gap-2">
      <VoicePanel />
      <SidebarUserProfile />
    </div>
  `,
})
export class SidebarFooter {}
