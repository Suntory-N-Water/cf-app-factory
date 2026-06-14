import { Hono } from 'hono';
import { appRefererProxyRoutes } from './routes/app-referer-proxy';
import { appProxyRoutes } from './routes/app-proxy';
import { apiRoutes } from './routes/api';
import { dashboardRoutes } from './routes/dashboard';
import type { AppEnv } from './types';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.route('/', dashboardRoutes);
  app.route('/api', apiRoutes);
  app.route('/', appProxyRoutes);
  app.route('/', appRefererProxyRoutes);

  app.notFound((c) => c.json({ error: '見つかりません' }, 404));

  app.onError((error, c) => {
    console.error('リクエスト処理に失敗しました', String(error));
    return c.json({ error: '内部エラーが発生しました' }, 500);
  });

  return app;
}
