import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_MARK, APP_NAME } from '@shared/config/brand';
import { Dolobeb } from '@shared/ui/dolobeb';
import { LandingAppPreview } from './landing-app-preview';
import { LandingMascot } from './landing-mascot';
import { LandingSlowModePreview } from './landing-slow-mode-preview';
import { AuthService } from '@entities/session';

/**
 * The public front page: what placemood is, what already works, and the
 * way in. Copy follows docs/product/positioning.md and only names what
 * the core and the client ship (docs/plans/discord-parity.md).
 */
@Component({
  selector: 'LandingLayout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Dolobeb, LandingAppPreview, LandingMascot, LandingSlowModePreview],
  host: { class: 'pm-landing' },
  styles: `
    :host { display: block; min-height: 100vh; overflow-x: hidden; background: var(--color-ok-bg); color: var(--color-ok-text);
            font-size: 16px; line-height: 1.5; }
    a { color: inherit; text-decoration: none; }
    .wrap { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
    .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--color-ok-muted); }
    h1, h2, h3 { margin: 0; letter-spacing: -0.02em; }
    p { margin: 0; }
    /* Buttons */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; padding: 0 22px;
           border-radius: 14px; font-weight: 800; font-size: 15px; transition: transform .12s, background .12s, box-shadow .12s; }
    .btn:active { transform: translateY(1px); }
    .btn-main { background: var(--color-ok-accent); color: var(--color-ok-on-accent); box-shadow: 0 6px 24px rgba(127,178,229,.25); }
    .btn-main:hover { background: #A9CBEE; }
    .btn-ghost { background: var(--color-ok-surface-2); color: var(--color-ok-text); }
    .btn-ghost:hover { background: #2C3236; }
    .btn-sm { height: 38px; padding: 0 16px; border-radius: 11px; font-size: 14px; }
    /* Header */
    header { position: sticky; top: 0; z-index: 30; background: rgba(15,17,18,.82); backdrop-filter: blur(10px);
             border-bottom: 1px solid var(--color-ok-border); }
    header .wrap { display: flex; align-items: center; gap: 24px; height: 64px; }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 19px; letter-spacing: -0.02em; }
    .brand img { width: 34px; height: 34px; }
    nav.links { display: flex; gap: 22px; flex: 1; font-size: 14px; font-weight: 600; color: var(--color-ok-muted); }
    nav.links a:hover { color: var(--color-ok-text); }
    .head-actions { display: flex; gap: 8px; margin-left: auto; }
    /* Hero */
    .hero { position: relative; padding: 72px 0 56px; }
    .hero::before { content: ''; position: absolute; inset: -200px 0 auto; height: 640px; pointer-events: none;
                    background: radial-gradient(600px 320px at 78% 40%, rgba(127,178,229,.16), transparent 70%),
                                radial-gradient(500px 280px at 15% 20%, rgba(127,209,168,.10), transparent 70%); }
    .hero .wrap { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 48px; align-items: center; }
    .chip { display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 12px; border-radius: 999px;
            background: var(--color-ok-surface-1); border: 1px solid var(--color-ok-border); font-size: 13px; font-weight: 700; color: var(--color-ok-muted); }
    .chip i { width: 8px; height: 8px; border-radius: 4px; background: var(--color-ok-success); box-shadow: 0 0 0 4px rgba(127,209,168,.18); }
    .hero h1 { margin-top: 18px; font-size: 60px; line-height: 1.02; font-weight: 800; }
    .hero h1 em { font-style: normal; color: var(--color-ok-accent); }
    .hero .lead { margin-top: 20px; font-size: 19px; line-height: 1.55; color: #B9BEC1; max-width: 520px; }
    .hero .cta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 30px; }
    .hero .note { margin-top: 14px; font-size: 13px; color: var(--color-ok-muted); }
    /* Sections */
    section.block { padding: 88px 0; }
    section.block .head { max-width: 640px; margin-bottom: 40px; }
    section.block h2 { margin-top: 10px; font-size: 40px; line-height: 1.1; font-weight: 800; }
    section.block .head p { margin-top: 14px; font-size: 17px; color: #B9BEC1; }
    .promises { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .promise { padding: 22px; border-radius: 18px; background: var(--color-ok-surface-1); border: 1px solid var(--color-ok-border); }
    .promise .n { width: 36px; height: 36px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--color-ok-on-accent); }
    .promise h3 { margin-top: 14px; font-size: 19px; font-weight: 800; }
    .promise p { margin-top: 6px; color: #B9BEC1; font-size: 15px; }
    .bento { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px; }
    .card { grid-column: span 2; padding: 24px; border-radius: 20px; background: var(--color-ok-sidebar); border: 1px solid var(--color-ok-border);
            display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    .card.wide { grid-column: span 3; }
    .card .ic { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .card h3 { font-size: 20px; font-weight: 800; }
    .card p { color: #B9BEC1; font-size: 15px; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; padding-top: 6px; }
    .tags span { padding: 3px 10px; border-radius: 999px; background: var(--color-ok-surface-1); border: 1px solid var(--color-ok-border); font-size: 12.5px; font-weight: 600; color: #B9BEC1; }
    kbd { display: inline-block; padding: 1px 7px; border-radius: 6px; background: var(--color-ok-surface-2); border: 1px solid var(--color-ok-border);
          border-bottom-width: 2px; font: 700 12px inherit; font-family: inherit; color: var(--color-ok-text); }
    .final { text-align: center; padding: 96px 0 104px; }
    .final h2 { font-size: 48px; font-weight: 800; line-height: 1.05; margin-top: 18px; }
    .final p { margin: 14px auto 0; max-width: 520px; color: #B9BEC1; font-size: 17px; }
    .final .cta { display: flex; justify-content: center; gap: 10px; margin-top: 28px; flex-wrap: wrap; }
    footer { border-top: 1px solid var(--color-ok-border); }
    footer .wrap { display: flex; align-items: center; gap: 16px; height: 72px; color: var(--color-ok-muted); font-size: 14px; }
    footer .brand { font-size: 16px; color: var(--color-ok-text); }
    footer .brand img { width: 26px; height: 26px; }
    footer a:hover { color: var(--color-ok-text); }
    .two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; align-items: center; }
    .checks { list-style: none; padding: 0; margin: 24px 0 0; display: flex; flex-direction: column; gap: 14px; }
    .checks li { display: flex; gap: 12px; }
    .checks li i { flex: none; width: 24px; height: 24px; border-radius: 8px; background: rgba(127,209,168,.15); color: var(--color-ok-success);
                   display: flex; align-items: center; justify-content: center; font-style: normal; font-weight: 800; font-size: 13px; }
    .checks b { display: block; }
    .checks span { color: #B9BEC1; font-size: 15px; }
    @media (max-width: 980px) {
      nav.links { display: none; }
      .hero .wrap, .two { grid-template-columns: minmax(0, 1fr); }
      .hero h1 { font-size: 46px; }
      .card, .card.wide { grid-column: span 3; }
    }
    @media (max-width: 640px) {
      .wrap { padding: 0 16px; }
      header .wrap { gap: 12px; }
      .head-actions .btn-ghost { display: none; }
      .hero { padding: 40px 0 32px; }
      .hero h1 { font-size: 38px; }
      .hero .lead { font-size: 17px; }
      section.block { padding: 60px 0; }
      section.block h2, .final h2 { font-size: 32px; }
      .promises { grid-template-columns: minmax(0, 1fr); }
      .card, .card.wide { grid-column: span 6; }
    }
  `,
  template: `
    <header>
      <div class="wrap">
        <a routerLink="/" class="brand" aria-label="{{ appName }} — главная"><img [src]="mark" alt="" />{{ appName }}</a>
        <nav class="links" aria-label="Разделы">
          <a href="#features">Возможности</a>
          <a href="#streams">Для стримеров</a>
          <a href="#dolobeb">Долобеб</a>
        </nav>
        <div class="head-actions">
          @if (!signedIn()) {
            <a routerLink="/login" class="btn btn-ghost btn-sm">Войти</a>
          }
          <a routerLink="/channels/me" class="btn btn-main btn-sm">{{ signedIn() ? 'Открыть' : 'Начать' }}</a>
        </div>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="wrap">
          <div>
            <span class="chip"><i></i>Бета · зовём своих</span>
            <h1>Своя компания — <em>в&nbsp;сборе.</em></h1>
            <p class="lead">Чат, голосовые комнаты и показ экрана для друзей и небольших сообществ. В голос не звонят — в него подсаживаются, как к столику.</p>
            <div class="cta">
              <a routerLink="/channels/me" class="btn btn-main">Открыть в браузере</a>
              @if (!signedIn()) {
                <a routerLink="/login" class="btn btn-ghost">У меня есть аккаунт</a>
              }
            </div>
            <p class="note">Ничего не нужно ставить. Раскладка знакомая — как в Discord.</p>
          </div>

          <LandingAppPreview class="hero-visual" />
        </div>
      </section>

      <section class="block" aria-labelledby="why">
        <div class="wrap">
          <div class="head">
            <div class="eyebrow">Зачем</div>
            <h2 id="why">Чтобы просто быть вместе</h2>
            <p>Не созваниваться, не договариваться, не искать ссылку. Открыл — видишь, кто где, и присоединился.</p>
          </div>
          <div class="promises">
            <div class="promise">
              <div class="n" style="background:var(--color-ok-success)">1</div>
              <h3>Подсесть одним нажатием</h3>
              <p>Голосовая комната видна в списке каналов: кто сидит, кто говорит. Нажал «Подсесть» — ты там.</p>
            </div>
            <div class="promise">
              <div class="n" style="background:var(--color-ok-accent)">2</div>
              <h3>Экран за секунду</h3>
              <p>Показать игру, вкладку или код — одна кнопка в панели голоса. Остановить — тоже одна.</p>
            </div>
            <div class="promise">
              <div class="n" style="background:var(--color-ok-warning)">3</div>
              <h3>Переучиваться не надо</h3>
              <p>Места слева, каналы, чат, люди справа — всё там, где ты привык искать. Только аккуратнее.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" class="block" aria-labelledby="features-title" style="padding-top: 0">
        <div class="wrap">
          <div class="head">
            <div class="eyebrow">Что уже работает</div>
            <h2 id="features-title">Всё нужное для своей компании</h2>
            <p>Не обещания на потом — это есть в бете сегодня.</p>
          </div>
          <div class="bento">
            <article class="card wide">
              <div class="ic" style="background:rgba(127,209,168,.15);color:var(--color-ok-success)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/></svg>
              </div>
              <h3>Голосовые комнаты</h3>
              <p>Зашёл и говоришь. Видно, кто говорит, кто выключил микрофон. Связь сама переподключается после обрыва.</p>
              <div class="tags"><span>показ экрана со звуком</span><span>камера</span><span>выбор устройств</span><span>звонки в личке</span></div>
            </article>
            <article class="card wide">
              <div class="ic" style="background:rgba(127,178,229,.15);color:var(--color-ok-accent)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <h3>Чат, который не теряет</h3>
              <p>Ответы, реакции, упоминания, файлы и картинки. Непрочитанное помечено, история подгружается без рывков.</p>
              <div class="tags"><span>закрепы</span><span>поиск</span><span>«печатает…»</span><span>&#64;everyone</span><span>правка и удаление</span></div>
            </article>
            <article class="card">
              <div class="ic" style="background:rgba(230,194,122,.15);color:var(--color-ok-warning)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>
              </div>
              <h3>Свои места</h3>
              <p>Каналы и категории, роли с цветами и правами, приглашения со сроком и лимитом.</p>
            </article>
            <article class="card">
              <div class="ic" style="background:rgba(240,138,128,.15);color:var(--color-ok-danger)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M21.5 20a6.5 6.5 0 00-4-6"/></svg>
              </div>
              <h3>Друзья и группы</h3>
              <p>Личка, группы до десяти человек, звонки. Заявки в друзья и блокировка, если надо.</p>
            </article>
            <article class="card">
              <div class="ic" style="background:rgba(185,190,193,.12);color:#B9BEC1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>
              </div>
              <h3>Быстро руками</h3>
              <p><kbd>Ctrl</kbd> <kbd>K</kbd> — в любой канал за пару букв. <kbd>Alt</kbd> <kbd>↑</kbd> — соседний канал, <kbd>Esc</kbd> — прочитано.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="streams" class="block" aria-labelledby="streams-title" style="padding-top: 0">
        <div class="wrap two">
          <div>
            <div class="eyebrow">Для стримеров</div>
            <h2 id="streams-title" style="margin-top:10px;font-size:40px;line-height:1.1;font-weight:800">Позови свой чат — и&nbsp;он не развалится</h2>
            <ul class="checks">
              <li><i>✓</i><div><b>Медленный режим</b><span>От пяти секунд до шести часов между сообщениями — на любой канал. Модераторов не касается.</span></div></li>
              <li><i>✓</i><div><b>Новые аккаунты подождут</b><span>Только что созданный аккаунт не сможет сразу писать — рейд из свежих регистраций теряет смысл.</span></div></li>
              <li><i>✓</i><div><b>Модераторы с нужными правами</b><span>Кик, бан, удаление чужих сообщений, выключить микрофон или перенести в другой голосовой канал.</span></div></li>
            </ul>
          </div>
          <LandingSlowModePreview />
        </div>
      </section>

      <section id="dolobeb" class="block" aria-labelledby="dolobeb-title" style="padding-top: 0">
        <div class="wrap">
          <LandingMascot />
        </div>
      </section>

      <section class="final" aria-labelledby="final-title">
        <div class="wrap">
          <Dolobeb state="happy" [size]="96" />
          <h2 id="final-title">Собери своих</h2>
          <p>Создай место за минуту, отправь друзьям приглашение — и встречайтесь в Болталке вечером.</p>
          <div class="cta">
            <a routerLink="/channels/me" class="btn btn-main">Открыть {{ appName }}</a>
          </div>
        </div>
      </section>
    </main>

    <footer>
      <div class="wrap">
        <span class="brand"><img [src]="mark" alt="" />{{ appName }}</span>
        <span>бета, {{ year }}</span>
        <span style="flex:1"></span>
        <a routerLink="/login">Войти</a>
      </div>
    </footer>
  `,
})
export class LandingLayout {
  protected readonly appName = APP_NAME;
  protected readonly mark = APP_MARK;
  protected readonly year = new Date().getFullYear();
  protected readonly signedIn = inject(AuthService).signedIn;
}
