import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';
import { routes } from '../routes/content-api';

const casUrl = strapi.plugin('cas').config('url');
const serviceUrl = `${strapi.config.get('server.url')}/api${routes.callback.path}`;

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async login(ctx: Context) {
    ctx.redirect(`${casUrl}/login?service=${encodeURIComponent(serviceUrl)}`);
  },
  async callback(ctx: Context) {
    const { ticket } = ctx.query as { ticket?: string };
    if (!ticket) {
      ctx.status = 400;
      ctx.body = { error: 'CAS: missing ticket query param' };
      return;
    }
    const attrs = await strapi.plugin('cas').service('service').validateTicket(ticket, serviceUrl);

    const up = strapi.plugin('users-permissions');
    let user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { username: attrs.username } });
    if (user) {
      user = await up.service('user').edit(user.id, { email: attrs.email });
      ctx.body = {
        jwt: await up.service('jwt').issue({ id: user.id }),
        user: await strapi.contentAPI.sanitize.output(
          user,
          strapi.getModel('plugin::users-permissions.user'),
          { auth: ctx.state.auth },
        ),
      };
      return;
    }
    const settings: { default_role?: number } = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get();
    const role = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: settings.default_role } });
    user = await up.service('user').add({
      username: attrs.username,
      email: attrs.email,
      role: role.id,
      confirmed: true,
    });
    ctx.body = {
      jwt: await up.service('jwt').issue({ id: user.id }),
      user: await strapi.contentAPI.sanitize.output(
        user,
        strapi.getModel('plugin::users-permissions.user'),
        { auth: ctx.state.auth },
      ),
    };
  },
});

export default controller;
