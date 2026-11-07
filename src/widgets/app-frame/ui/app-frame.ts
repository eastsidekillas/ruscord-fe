import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Sidebar } from '@widgets/sidebar/ui/sidebar';
import { ServerSidebar } from '@widgets/sidebar/ui/server-sidebar/server-sidebar';
import { TitleBar } from '@widgets/title-bar/ui/title-bar';

/**
 * The frame of every signed-in page: the title bar on top, then the rail of
 * places, the channel column and the page itself (projected).
 */
@Component({
  selector: 'AppFrame',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sidebar, ServerSidebar, TitleBar],
  host: { class: 'flex flex-col h-screen overflow-hidden bg-ok-bg text-ok-text text-[15px]' },
  template: `
    <TitleBar />
    <div class="flex flex-1 min-h-0">
      <ServerSidebar />
      <Sidebar [serverId]="serverId()" [isServerRoute]="!!serverId()" />
      <main class="flex-1 flex flex-col min-w-0 bg-ok-surface-1">
        <ng-content />
      </main>
    </div>
  `,
})
export class AppFrame {
  /** The open server; null on the direct messages pages. */
  readonly serverId = input<string | null>(null);
}
