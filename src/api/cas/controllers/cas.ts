import type { Context } from 'koa';
import crypto from 'node:crypto';
import { routes } from '../routes/cas';

const service = `${process.env.URL}/api${routes.callback.path}`;

export default ({ strapi }) => ({
    async login(ctx: Context) {
        ctx.redirect(`${process.env.CAS_URL}/login?service=${encodeURIComponent(service)}`);
    },
    async callback(ctx: Context) {
        const { ticket } = ctx.query as { ticket?: string };
        if (!ticket) {
            ctx.status = 400;
            ctx.body = { error: 'CAS: missing ticket query param' };
            return;
        }
        try {
            const attrs = await strapi.service('api::cas.cas').validateTicket(ticket, service);
            const user = await strapi.db
                .query('plugin::users-permissions.user')
                .findOne({ where: { username: attrs.username } });
            if (user) {
                ctx.params.id = user.id;
                ctx.request.body = {
                    email: attrs.email,
                };
                await strapi.controller('plugin::users-permissions.user').update(ctx);
                ctx.body = {
                    jwt: strapi.plugin('users-permissions').services.jwt.issue({ id: user.id }),
                    user: await strapi.contentAPI.sanitize.output(
                        user,
                        strapi.getModel('plugin::users-permissions.user'),
                        { auth: ctx.state.auth },
                    ),
                };
                return;
            }
            ctx.request.body = {
                ...attrs,
                password: crypto.randomBytes(32).toString('hex'),
            };
            return await strapi.controller('plugin::users-permissions.auth').register(ctx);
        } catch (err: unknown) {
            ctx.status = 502;
            ctx.body = {
                error: 'CAS: controller callback failed',
                details: err instanceof Error ? err.message : String(err),
            };
        }
    },
});
