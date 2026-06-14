import { Hono } from 'hono';
import * as v from 'valibot';
import { SUPERVISOR_NAME } from '../config/constants';
import { generateAppCodeWithWorkersAi } from '../infrastructure/workers-ai-app-generator';
import type { AppEnv } from '../types';
import { DashboardPage } from '../ui/dashboard';
import { generateApp } from '../usecase/generate-app';

const generateSchema = v.object({
  prompt: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(2_000)),
});

export const dashboardRoutes = new Hono<AppEnv>()
  .get('/', async (c) => {
    const supervisor = c.env.SUPERVISOR.getByName(SUPERVISOR_NAME);
    const message = c.req.query('message');
    return c.html(
      <DashboardPage apps={await supervisor.listApps()} message={message} />,
    );
  })
  .post('/apps', async (c) => {
    const formData = await c.req.formData();
    const parsed = v.safeParse(generateSchema, {
      prompt: formData.get('prompt'),
    });

    const supervisor = c.env.SUPERVISOR.getByName(SUPERVISOR_NAME);
    if (!parsed.success) {
      return c.html(
        <DashboardPage
          apps={await supervisor.listApps()}
          message='プロンプトを入力してください'
        />,
        400,
      );
    }

    try {
      const created = await generateApp(
        { prompt: parsed.output.prompt },
        {
          generateAppCode: (prompt) =>
            generateAppCodeWithWorkersAi(c.env.AI, prompt),
          createApp: (app) => supervisor.createApp(app),
        },
      );

      return c.redirect(
        `/?message=${encodeURIComponent(`${created.name} を作成しました`)}`,
      );
    } catch (error) {
      return c.html(
        <DashboardPage
          apps={await supervisor.listApps()}
          message={
            error instanceof Error ? error.message : 'アプリ生成に失敗しました'
          }
        />,
        502,
      );
    }
  })
  .post('/apps/:id/stop', async (c) => {
    const supervisor = c.env.SUPERVISOR.getByName(SUPERVISOR_NAME);
    const stopped = await supervisor.stopApp(c.req.param('id'));
    const message = stopped ? '更新しました' : 'アプリが見つかりません';
    return c.redirect(`/?message=${encodeURIComponent(message)}`);
  })
  .post('/apps/:id/delete', async (c) => {
    const supervisor = c.env.SUPERVISOR.getByName(SUPERVISOR_NAME);
    const deleted = await supervisor.deleteApp(c.req.param('id'));
    const message = deleted ? '更新しました' : 'アプリが見つかりません';
    return c.redirect(`/?message=${encodeURIComponent(message)}`);
  });
