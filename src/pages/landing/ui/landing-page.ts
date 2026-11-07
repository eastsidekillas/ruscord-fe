import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_MARK, APP_NAME } from '@shared/config/brand';
import { Dolobeb, DOLOBEB_LABELS, DolobebState } from '@shared/ui/dolobeb';
import { AuthService } from '@entities/session';

/** What dolobeb says about each mood in the gallery. */
const MOODS: Record<string, { state: DolobebState; line: string }> = {
  happy: { state: 'happy', line: 'Кто-то подсел в голос. Долобеб доволен.' },
  laughing: { state: 'laughing', line: 'В чате мемы. Долобеб не сдерживается.' },
  thinking: { state: 'thinking', line: 'Ищет то сообщение из прошлого вторника.' },
  surprised: { state: 'surprised', line: 'Пришло сорок человек со стрима разом.' },
  speaking: { state: 'speaking', line: 'Говорит. Зелёная рамка — это он.' },
  sleeping: { state: 'sleeping', line: 'Все разошлись. Долобеб ждёт до вечера.' },
};

/**
 * The public front page: what placemood is, what already works, and the
 * way in. Copy follows docs/product/positioning.md and only names what
 * the core and the client ship (docs/plans/discord-parity.md).
 */
@Component({
  selector: 'LandingLayout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Dolobeb],
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
    .hero-visual { position: relative; padding-top: 30px; }

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

    .stream { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; align-items: center; }
    .checks { list-style: none; padding: 0; margin: 24px 0 0; display: flex; flex-direction: column; gap: 14px; }
    .checks li { display: flex; gap: 12px; }
    .checks li i { flex: none; width: 24px; height: 24px; border-radius: 8px; background: rgba(127,209,168,.15); color: var(--color-ok-success);
                   display: flex; align-items: center; justify-content: center; font-style: normal; font-weight: 800; font-size: 13px; }
    .checks b { display: block; }
    .checks span { color: #B9BEC1; font-size: 15px; }
    .raid { border-radius: 20px; background: var(--color-ok-surface-1); border: 1px solid var(--color-ok-border); padding: 18px; display: flex; flex-direction: column; gap: 12px; }
    .raid .line { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; }
    .raid .line .av { width: 30px; height: 30px; border-radius: 9px; flex: none; }
    .raid .line small { color: var(--color-ok-muted); }
    .raid .wait { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--color-ok-surface-2); font-size: 13px; color: #B9BEC1; }
    .raid .wait b { color: var(--color-ok-warning); }
    .raid .bar { height: 44px; border-radius: 12px; background: var(--color-ok-bg); border: 1px solid var(--color-ok-border); display: flex; align-items: center;
                 padding: 0 14px; color: var(--color-ok-muted); font-size: 14px; justify-content: space-between; }

    .mascot { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 40px; align-items: center;
              padding: 40px; border-radius: 28px; background: linear-gradient(135deg, rgba(127,178,229,.12), rgba(127,209,168,.06)), var(--color-ok-sidebar);
              border: 1px solid var(--color-ok-border); }
    .stage { display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center; }
    .stage .say { min-height: 48px; font-size: 17px; font-weight: 700; max-width: 320px; }
    .moods { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
    .moods button { height: 40px; padding: 0 14px 0 6px; border-radius: 12px; border: 1px solid var(--color-ok-border); background: var(--color-ok-surface-1);
                    color: var(--color-ok-text); font: 700 14px inherit; font-family: inherit; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
    .moods button[aria-pressed='true'] { border-color: var(--color-ok-accent); background: var(--color-ok-surface-2); }

    .final { text-align: center; padding: 96px 0 104px; }
    .final h2 { font-size: 48px; font-weight: 800; line-height: 1.05; margin-top: 18px; }
    .final p { margin: 14px auto 0; max-width: 520px; color: #B9BEC1; font-size: 17px; }
    .final .cta { display: flex; justify-content: center; gap: 10px; margin-top: 28px; flex-wrap: wrap; }

    footer { border-top: 1px solid var(--color-ok-border); }
    footer .wrap { display: flex; align-items: center; gap: 16px; height: 72px; color: var(--color-ok-muted); font-size: 14px; }
    footer .brand { font-size: 16px; color: var(--color-ok-text); }
    footer .brand img { width: 26px; height: 26px; }
    footer a:hover { color: var(--color-ok-text); }

    @media (max-width: 980px) {
      nav.links { display: none; }
      .hero .wrap, .stream, .mascot { grid-template-columns: minmax(0, 1fr); }
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
      .app { grid-template-columns: 44px minmax(0, 1fr); height: 380px; }
      .app .chans { display: none; }
      .peek { right: 4px; }
      section.block { padding: 60px 0; }
      section.block h2, .final h2 { font-size: 32px; }
      .promises { grid-template-columns: minmax(0, 1fr); }
      .card, .card.wide { grid-column: span 6; }
      .mascot { padding: 24px; }
    }
    @media (prefers-reduced-motion: no-preference) {
      .peek { animation: peek 5s ease-in-out infinite; }
      @keyframes peek { 0%, 100% { transform: rotate(8deg) translateY(0); } 50% { transform: rotate(4deg) translateY(-6px); } }
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

          <div class="hero-visual" aria-hidden="true">
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
          </div>
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
        <div class="wrap stream">
          <div>
            <div class="eyebrow">Для стримеров</div>
            <h2 id="streams-title" style="margin-top:10px;font-size:40px;line-height:1.1;font-weight:800">Позови свой чат — и&nbsp;он не развалится</h2>
            <ul class="checks">
              <li><i>✓</i><div><b>Медленный режим</b><span>От пяти секунд до шести часов между сообщениями — на любой канал. Модераторов не касается.</span></div></li>
              <li><i>✓</i><div><b>Новые аккаунты подождут</b><span>Только что созданный аккаунт не сможет сразу писать — рейд из свежих регистраций теряет смысл.</span></div></li>
              <li><i>✓</i><div><b>Модераторы с нужными правами</b><span>Кик, бан, удаление чужих сообщений, выключить микрофон или перенести в другой голосовой канал.</span></div></li>
            </ul>
          </div>
          <div class="raid" aria-hidden="true">
            <div class="line"><span class="av" style="background:#7FB2E5"></span><div><b>Шуня</b> <small>модератор</small><div>Добро пожаловать со стрима! Правила в #новости</div></div></div>
            <div class="line"><span class="av" style="background:#7FD1A8"></span><div><b>Лиса</b><div>а когда следующий стрим?</div></div></div>
            <div class="wait"><Dolobeb state="thinking" [size]="32" [animate]="false" /><span>Медленный режим: следующее сообщение через <b>0:24</b></span></div>
            <div class="bar"><span>Написать в #общий</span><span>🐢 30 с</span></div>
          </div>
        </div>
      </section>

      <section id="dolobeb" class="block" aria-labelledby="dolobeb-title" style="padding-top: 0">
        <div class="wrap">
          <div class="mascot">
            <div class="stage">
              <Dolobeb [state]="moodState()" [size]="200" [label]="moodLabel()" />
              <p class="say" aria-live="polite">{{ moodLine() }}</p>
            </div>
            <div>
              <div class="eyebrow">Талисман</div>
              <h2 id="dolobeb-title" style="margin-top:10px;font-size:40px;line-height:1.1;font-weight:800">Знакомься: долобеб</h2>
              <p style="margin-top:14px;font-size:17px;color:#B9BEC1">Он живёт в пустых каналах, радуется, когда кто-то подсел, и засыпает, когда все разошлись. Наведи — покажет настроение.</p>
              <div class="moods" role="group" aria-label="Настроения долобеба">
                <button type="button" [attr.aria-pressed]="mood() === 'happy'" (mouseenter)="mood.set('happy')" (focus)="mood.set('happy')" (click)="mood.set('happy')"><Dolobeb state="happy" [size]="28" [animate]="false" />Радуется</button>
                <button type="button" [attr.aria-pressed]="mood() === 'laughing'" (mouseenter)="mood.set('laughing')" (focus)="mood.set('laughing')" (click)="mood.set('laughing')"><Dolobeb state="laughing" [size]="28" [animate]="false" />Ржёт</button>
                <button type="button" [attr.aria-pressed]="mood() === 'thinking'" (mouseenter)="mood.set('thinking')" (focus)="mood.set('thinking')" (click)="mood.set('thinking')"><Dolobeb state="thinking" [size]="28" [animate]="false" />Думает</button>
                <button type="button" [attr.aria-pressed]="mood() === 'surprised'" (mouseenter)="mood.set('surprised')" (focus)="mood.set('surprised')" (click)="mood.set('surprised')"><Dolobeb state="surprised" [size]="28" [animate]="false" />Удивлён</button>
                <button type="button" [attr.aria-pressed]="mood() === 'speaking'" (mouseenter)="mood.set('speaking')" (focus)="mood.set('speaking')" (click)="mood.set('speaking')"><Dolobeb state="speaking" [size]="28" [animate]="false" />Говорит</button>
                <button type="button" [attr.aria-pressed]="mood() === 'sleeping'" (mouseenter)="mood.set('sleeping')" (focus)="mood.set('sleeping')" (click)="mood.set('sleeping')"><Dolobeb state="sleeping" [size]="28" [animate]="false" />Спит</button>
              </div>
            </div>
          </div>
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

  protected readonly mood = signal<keyof typeof MOODS>('happy');
  protected readonly moodState = computed(() => MOODS[this.mood()].state);
  protected readonly moodLine = computed(() => MOODS[this.mood()].line);
  protected readonly moodLabel = computed(() => DOLOBEB_LABELS[this.moodState()]);
}
