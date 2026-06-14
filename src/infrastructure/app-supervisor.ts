import { DurableObject } from 'cloudflare:workers';
import { DYNAMIC_COMPATIBILITY_DATE } from '../config/constants';
import type { AppRecord, AppRow, GeneratedApp } from '../domain/app';

type CreateAppInput = GeneratedApp & {
  readonly prompt: string;
};

export class AppSupervisor extends DurableObject<CloudflareBindings> {
  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS apps (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          prompt TEXT NOT NULL,
          code TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('running', 'stopped', 'deleted'))
        );
        CREATE INDEX IF NOT EXISTS idx_apps_created_at ON apps(created_at DESC);
      `);
    });
  }

  listApps(): AppRecord[] {
    const rows = this.ctx.storage.sql
      .exec<AppRow>(
        `
          SELECT id, name, prompt, code, created_at, updated_at, status
          FROM apps
          ORDER BY created_at DESC
        `,
      )
      .toArray();

    return rows.map((row) => this.toRecord(row));
  }

  createApp(input: CreateAppInput): AppRecord {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    this.ctx.storage.sql.exec(
      `
        INSERT INTO apps (id, name, prompt, code, created_at, updated_at, status)
        VALUES (?, ?, ?, ?, ?, ?, 'running')
      `,
      id,
      input.name,
      input.prompt,
      input.code,
      now,
      now,
    );

    const created = this.getApp(id);
    if (!created) {
      throw new Error('作成したアプリを読み取れませんでした');
    }

    return this.toRecord(created);
  }

  stopApp(id: string): AppRecord | null {
    const appRow = this.getApp(id);
    if (!appRow || appRow.status === 'deleted') {
      return null;
    }

    this.ctx.facets.abort(id, `アプリ ${id} を停止しました`);
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      "UPDATE apps SET status = 'stopped', updated_at = ? WHERE id = ?",
      now,
      id,
    );

    const stopped = this.getApp(id);
    return stopped ? this.toRecord(stopped) : null;
  }

  deleteApp(id: string): AppRecord | null {
    const appRow = this.getApp(id);
    if (!appRow || appRow.status === 'deleted') {
      return null;
    }

    this.ctx.facets.delete(id);
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `
        UPDATE apps
        SET status = 'deleted', code = '', updated_at = ?
        WHERE id = ?
      `,
      now,
      id,
    );

    const deleted = this.getApp(id);
    return deleted ? this.toRecord(deleted) : null;
  }

  override async fetch(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);
    const appMatch = /^\/app\/([^/]+)(\/.*)?$/.exec(requestUrl.pathname);
    const id = appMatch?.[1];
    if (!id) {
      return Response.json(
        { error: 'アプリ ID がありません' },
        { status: 400 },
      );
    }

    const appRow = this.getApp(decodeURIComponent(id));
    if (!appRow || appRow.status === 'deleted') {
      return Response.json(
        { error: 'アプリが見つかりません' },
        { status: 404 },
      );
    }

    if (appRow.status === 'stopped') {
      this.ctx.storage.sql.exec(
        "UPDATE apps SET status = 'running', updated_at = ? WHERE id = ?",
        new Date().toISOString(),
        appRow.id,
      );
    }

    const facet = this.ctx.facets.get(appRow.id, async () => {
      const worker = this.env.LOADER.get(
        `app:${appRow.id}:${appRow.updated_at}`,
        async () => ({
          compatibilityDate: DYNAMIC_COMPATIBILITY_DATE,
          mainModule: 'worker.js',
          modules: { 'worker.js': appRow.code },
          globalOutbound: null,
        }),
      );

      return { class: worker.getDurableObjectClass('App') };
    });

    requestUrl.pathname = appMatch[2] ?? '/';
    const response = await facet.fetch(
      new Request(requestUrl.toString(), request),
    );
    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.toLowerCase().includes('text/html')) {
      return response;
    }

    const appBasePath = `/app/${appRow.id}/`;
    return new HTMLRewriter()
      .on('head', {
        element(element) {
          element.prepend(`<base href="${appBasePath}">`, { html: true });
        },
      })
      .on('[action],[href],[src]', {
        element(element) {
          for (const attribute of ['action', 'href', 'src']) {
            const value = element.getAttribute(attribute);
            if (value?.startsWith('/') && !value.startsWith('//')) {
              element.setAttribute(
                attribute,
                `${appBasePath}${value.slice(1)}`,
              );
            }
          }
        },
      })
      .transform(response);
  }

  private getApp(id: string): AppRow | null {
    const row = this.ctx.storage.sql
      .exec<AppRow>(
        `
          SELECT id, name, prompt, code, created_at, updated_at, status
          FROM apps
          WHERE id = ?
        `,
        id,
      )
      .toArray()[0];

    return row ?? null;
  }

  private toRecord(row: AppRow): AppRecord {
    return {
      id: row.id,
      name: row.name,
      prompt: row.prompt,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      url: `/app/${row.id}/`,
    };
  }
}
