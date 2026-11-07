import { ChangeDetectionStrategy, Component } from '@angular/core';
import { APP_MARK } from '@shared/config/brand';
import { Dolobeb } from '@shared/ui/dolobeb';

/** The app drawn small for the front page: the layout of ruscord-core ADR-0045. */
@Component({
  selector: 'LandingAppPreview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dolobeb],
  host: { 'aria-hidden': 'true' },
  styles: `
    /* The app, drawn small */
    .app { position: relative; border-radius: 20px; background: #0B0D0E; border: 1px solid var(--color-ok-border);
           box-shadow: 0 30px 80px rgba(0,0,0,.55); overflow: hidden; display: grid; grid-template-columns: 52px 168px minmax(0, 1fr);
           height: 420px; font-size: 12px; }
    .app .rail { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 0; }
    .app .rail span { width: 34px; height: 34px; border-radius: 10px; background: var(--color-ok-surface-2); display: flex; align-items: center;
                      justify-content: center; font-weight: 800; font-size: 11px; position: relative; }
    .app .rail span.on { background: var(--color-ok-accent); color: var(--color-ok-on-accent); }
    .app .rail span.on::before { content: ''; position: absolute; left: -9px; top: 6px; width: 3px; height: 22px; border-radius: 0 3px 3px 0; background: var(--color-ok-text); }
    .app .rail .dot { position: absolute; right: -3px; bottom: -3px; min-width: 14px; height: 14px; border-radius: 7px; background: var(--color-ok-danger);
                      color: var(--color-ok-on-danger); font-size: 9px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px #0B0D0E; }
    .app .chans { background: var(--color-ok-sidebar); border-radius: 12px 0 0 0; display: flex; flex-direction: column; min-width: 0; }
    .app .chans .title { padding: 10px 12px 8px; border-bottom: 1px solid var(--color-ok-border); }
    .app .chans .title b { display: block; font-size: 13px; }
    .app .chans .title small { color: var(--color-ok-warning); font-weight: 700; font-size: 10.5px; }
    .app .cat { padding: 10px 12px 4px; font-size: 9.5px; font-weight: 700; letter-spacing: .08em; color: var(--color-ok-muted); }
    .app .ch { margin: 0 6px; padding: 5px 8px; border-radius: 7px; color: var(--color-ok-muted); display: flex; gap: 6px; }
    .app .ch.on { background: var(--color-ok-surface-2); color: var(--color-ok-text); font-weight: 700; }
    .app .ch.unread { color: var(--color-ok-text); font-weight: 700; }
    .app .vc { margin: 2px 6px; padding: 7px 8px; border-radius: 10px; border: 1px solid rgba(127,209,168,.3); background: rgba(24,27,29,.7); }
    .app .vc .row { display: flex; align-items: center; gap: 5px; }
    .app .vc .who { display: flex; gap: 4px; margin-top: 6px; align-items: center; }
    .app .av { width: 20px; height: 20px; border-radius: 6px; flex: none; }
    .app .speak { box-shadow: 0 0 0 2px var(--color-ok-sidebar), 0 0 0 3.5px var(--color-ok-success); }
    .app .sit { margin-left: auto; height: 20px; padding: 0 7px; border-radius: 6px; background: var(--color-ok-success); color: var(--color-ok-on-accent);
                font-weight: 800; font-size: 10px; display: flex; align-items: center; }
    .app .me { margin: auto 6px 6px; padding: 6px; border-radius: 10px; background: var(--color-ok-surface-1); display: flex; align-items: center; gap: 6px; }
    .app .me b { flex: 1; font-size: 11px; }
    .app .me i { width: 14px; height: 14px; border-radius: 4px; background: var(--color-ok-surface-2); }
    .app .chat { background: var(--color-ok-surface-1); display: flex; flex-direction: column; min-width: 0; }
    .app .chat .top { height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 14px; border-bottom: 1px solid var(--color-ok-border); font-weight: 800; font-size: 13px; }
    .app .chat .top span { color: var(--color-ok-muted); }
    .app .msgs { flex: 1; padding: 12px 14px; display: flex; flex-direction: column; justify-content: flex-end; gap: 10px; }
    .app .msg { display: flex; gap: 8px; }
    .app .msg .av { width: 26px; height: 26px; border-radius: 8px; }
    .app .msg b { font-size: 11.5px; }
    .app .msg small { color: var(--color-ok-muted); font-size: 10px; margin-left: 4px; }
    .app .msg p { color: #D5D8DA; font-size: 11.5px; line-height: 1.4; }
    .app .mention { padding: 0 3px; border-radius: 4px; background: rgba(127,178,229,.18); color: #A9CBEE; font-weight: 600; }
    .app .react { display: inline-flex; gap: 4px; margin-top: 4px; }
    .app .react span { padding: 1px 6px; border-radius: 6px; background: var(--color-ok-surface-2); border: 1px solid var(--color-ok-border); font-size: 10.5px; }
    .app .react span.mine { border-color: var(--color-ok-accent); }
    .app .hl { margin: 0 -14px; padding: 6px 14px; background: rgba(230,194,122,.08); box-shadow: inset 2px 0 0 var(--color-ok-warning); }
    .app .joined { color: var(--color-ok-success); font-size: 11px; padding-left: 34px; }
    .app .input { margin: 0 12px 12px; height: 34px; border-radius: 10px; background: var(--color-ok-surface-2); color: var(--color-ok-muted);
                  display: flex; align-items: center; padding: 0 12px; font-size: 11.5px; }
    .app .typing { display: flex; align-items: center; gap: 6px; padding: 0 14px 6px; color: var(--color-ok-muted); font-size: 10.5px; }
    .peek { position: absolute; right: -14px; top: -46px; z-index: 2; transform: rotate(8deg); }
    :host { display: block; position: relative; padding-top: 30px; }
    @media (max-width: 640px) {
      .app { grid-template-columns: 44px minmax(0, 1fr); height: 380px; }
      .app .chans { display: none; }
      .peek { right: 4px; }
    }
    @media (prefers-reduced-motion: no-preference) {
      .peek { animation: peek 5s ease-in-out infinite; }
      @keyframes peek { 0%, 100% { transform: rotate(8deg) translateY(0); } 50% { transform: rotate(4deg) translateY(-6px); } }
    }
  `,
  template: `
          <Dolobeb class="peek" state="happy" [size]="84" />
          <div class="app">
            <div class="rail">
              <span style="background:#22272A"><img [src]="mark" alt="" width="24" height="24" /></span>
              <span class="on">СТ</span>
              <span>МЕ</span>
              <span>ДЗ<b class="dot">2</b></span>
            </div>
            <div class="chans">
              <div class="title"><b>Стрим-тусовка</b><small>3 пишут · 3 в голосе</small></div>
              <div class="cat">ТЕКСТОВЫЕ</div>
              <div class="ch on"># общий</div>
              <div class="ch unread"># мемы</div>
              <div class="ch"># новости</div>
              <div class="cat">ГОЛОСОВЫЕ</div>
              <div class="vc">
                <div class="row"><b>🔊 Болталка</b></div>
                <div class="who">
                  <span class="av speak" style="background:#E6C27A"></span>
                  <span class="av" style="background:#343A3E"></span>
                  <span class="av" style="background:#7FD1A8"></span>
                  <span class="sit">Подсесть</span>
                </div>
              </div>
              <div class="me"><span class="av" style="background:#F08A80"></span><b>Боб</b><i></i><i></i><i></i></div>
            </div>
            <div class="chat">
              <div class="top"><span>#</span> общий</div>
              <div class="msgs">
                <div class="msg"><span class="av" style="background:#E6C27A"></span><div><b>Аня</b><small>20:02</small>
                  <p>Кто со стрима — закиньте мем в #мемы, долобеб оценит</p>
                  <div class="react"><span class="mine">😂 12</span><span>👍 4</span></div></div></div>
                <div class="msg"><span class="av" style="background:#343A3E"></span><div><b>Кот</b><small>20:05</small><p>собираемся в Болталке, кто играет?</p></div></div>
                <div class="msg hl"><span class="av" style="background:#E6C27A"></span><div><b>Аня</b><small>20:09</small>
                  <p><span class="mention">&#64;Боб</span> подсаживайся</p></div></div>
                <div class="joined">🔊 <b>Боб</b> подсел в Болталку</div>
              </div>
              <div class="typing"><Dolobeb state="idle" [size]="16" [animate]="false" /><b style="color:#EDEFF0">Кот</b> печатает…</div>
              <div class="input">Написать в #общий</div>
            </div>
          </div>
  `,
})
export class LandingAppPreview {
  protected readonly mark = APP_MARK;
}
