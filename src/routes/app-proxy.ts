import { Hono } from 'hono';
import { SUPERVISOR_NAME } from '../config/constants';
import type { AppEnv } from '../types';

export const appProxyRoutes = new Hono<AppEnv>()
  .all('/app/:id', (c) => {
    const supervisor = c.env.SUPERVISOR.getByName(SUPERVISOR_NAME);
    return supervisor.fetch(c.req.raw);
  })
  .all('/app/:id/*', (c) => {
    const supervisor = c.env.SUPERVISOR.getByName(SUPERVISOR_NAME);
    return supervisor.fetch(c.req.raw);
  });
