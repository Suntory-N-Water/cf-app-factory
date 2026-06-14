import { Hono } from 'hono';
import { SUPERVISOR_NAME } from '../config/constants';
import type { AppEnv } from '../types';

export const appRefererProxyRoutes = new Hono<AppEnv>().all('*', (c) => {
  const referer = c.req.header('referer');
  if (!referer) {
    return c.notFound();
  }

  const refererUrl = new URL(referer);
  const appMatch = /^\/app\/([^/]+)\//.exec(refererUrl.pathname);
  if (!appMatch?.[1]) {
    return c.notFound();
  }

  const requestUrl = new URL(c.req.url);
  requestUrl.pathname = `/app/${appMatch[1]}${requestUrl.pathname}`;

  const supervisor = c.env.SUPERVISOR.getByName(SUPERVISOR_NAME);
  return supervisor.fetch(new Request(requestUrl.toString(), c.req.raw));
});
