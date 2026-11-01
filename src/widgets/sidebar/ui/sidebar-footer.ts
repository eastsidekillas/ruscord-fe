import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SidebarUserProfile } from '@widgets/sidebar/ui/sidebar-user-profile';
import { VoicePanel } from '@widgets/voice/ui/voice-panel';

/**
 * The bottom of the channel column on every page: the voice connection,
 * while there is one, above the user panel. The column is in both layouts,
 * so leaving a server page does not hide the call.
 */
@Component({
  selector: 'SidebarFooter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SidebarUserProfile, VoicePanel],
  template: `
    <div class="p-2 flex flex-col gap-2">
      <VoicePanel />
      <SidebarUserProfile />
    </div>
  `,
})
export class SidebarFooter {}
