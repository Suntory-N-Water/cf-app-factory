import { Style } from 'hono/css';
import type { AppRecord, AppStatus } from '../domain/app';
import { dashboardStyles } from './dashboard-styles';

const statusLabels: Record<AppStatus, string> = {
  running: '稼働中',
  stopped: '停止中',
  deleted: '削除済み',
};

export function DashboardPage(props: {
  readonly apps: readonly AppRecord[];
  readonly message?: string | undefined;
}) {
  const title = 'cf-app-factory';

  return (
    <html lang='ja'>
      <head>
        <meta charset='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <title>{title}</title>
        <Style />
      </head>
      <body class={dashboardStyles}>
        <main class='shell'>
          <div class='topbar'>
            <h1>{title}</h1>
            <div class='status'>{props.message ?? ''}</div>
          </div>

          <section class='workspace'>
            <form class='panel composer' method='post' action='/apps'>
              <label for='prompt'>プロンプト</label>
              <textarea
                id='prompt'
                name='prompt'
                maxLength={2000}
                autocomplete='off'
              />
              <div class='composer-actions'>
                <span class='count'>最大 2000 文字</span>
                <button class='primary' type='submit'>
                  生成
                </button>
              </div>
            </form>

            <section class='panel list'>
              <div class='list-head'>
                <span>アプリ</span>
                <span>状態</span>
                <span>更新日時</span>
                <span />
              </div>
              <div id='apps'>
                <AppList apps={props.apps} />
              </div>
            </section>
          </section>
        </main>
      </body>
    </html>
  );
}

function AppList(props: { readonly apps: readonly AppRecord[] }) {
  if (props.apps.length === 0) {
    return <div class='empty'>アプリはまだありません</div>;
  }

  return (
    <>
      {props.apps.map((app) => (
        <article class='app-row' key={app.id}>
          <div>
            <a class='app-name' href={app.url} target='_blank' rel='noreferrer'>
              {app.name}
            </a>
            <div class='app-prompt'>{app.prompt}</div>
          </div>
          <span class={`badge ${app.status}`}>{statusLabels[app.status]}</span>
          <span class='timestamp'>{formatTime(app.updatedAt)}</span>
          <div class='actions'>
            <form method='post' action={`/apps/${app.id}/stop`}>
              <button
                class='ghost'
                type='submit'
                disabled={app.status !== 'running'}
              >
                停止
              </button>
            </form>
            <form method='post' action={`/apps/${app.id}/delete`}>
              <button
                class='danger'
                type='submit'
                disabled={app.status === 'deleted'}
              >
                削除
              </button>
            </form>
          </div>
        </article>
      ))}
    </>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
