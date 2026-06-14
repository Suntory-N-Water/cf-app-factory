import { Hono } from 'hono';
import * as v from 'valibot';
import { SUPERVISOR_NAME } from '../config/constants';
import { generateApp } from '../usecase/generate-app';
import { generateAppCodeWithWorkersAi } from '../infrastructure/workers-ai-app-generator';
import type { AppEnv } from '../types';

const generateSchema = v.object({
  prompt: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(2_000)),
});

export const apiRoutes = new Hono<AppEnv>()
  .get('/apps', async (c) => {
    const supervisor = c.env.SUPERVISOR.getByName(SUPERVISOR_NAME);
    return c.json({ apps: await supervisor.listApps() });
  })
  .post('/generate', async (c) => {
    let body: unknown;

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'JSON を読み取れませんでした' }, 400);
    }

    const parsed = v.safeParse(generateSchema, body);
    if (!parsed.success) {
      return c.json({ error: 'プロンプトを入力してください' }, 400);
    }

    try {
      const supervisor = c.env.SUPERVISOR.getByName(SUPERVISOR_NAME);
      const created = await generateApp(
        { prompt: parsed.output.prompt },
        {
          generateAppCode: (prompt) =>
            generateAppCodeWithWorkersAi(c.env.AI, prompt),
          createApp: (app) => supervisor.createApp(app),
        },
      );

      return c.json({ app: created }, 201);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'アプリ生成に失敗しました';
      return c.json({ error: message }, 502);
    }
  })
  .post('/apps/:id/stop', async (c) => {
    const supervisor = c.env.SUPERVISOR.getByName(SUPERVISOR_NAME);
    const stopped = await supervisor.stopApp(c.req.param('id'));
    if (!stopped) {
      return c.json({ error: 'アプリが見つかりません' }, 404);
    }

    return c.json({ app: stopped });
  })
  .delete('/apps/:id', async (c) => {
    const supervisor = c.env.SUPERVISOR.getByName(SUPERVISOR_NAME);
    const deleted = await supervisor.deleteApp(c.req.param('id'));
    if (!deleted) {
      return c.json({ error: 'アプリが見つかりません' }, 404);
    }

    return c.json({ app: deleted });
  });
