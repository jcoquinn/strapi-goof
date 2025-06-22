import type { Context } from 'koa';
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
        const attrs = await strapi.service('api::cas.cas').validateTicket(ticket, service);
        let user = await strapi.db
            .query('plugin::users-permissions.user')
            .findOne({ where: { username: attrs.username } });
        if (user) {
            user = await strapi
                .service('plugin::users-permissions.user')
                .edit(user.id, { email: attrs.email, provider: 'GS' });
            ctx.body = {
                jwt: await strapi.service('plugin::users-permissions.jwt').issue({ id: user.id }),
                user: await strapi.contentAPI.sanitize.output(
                    user,
                    strapi.getModel('plugin::users-permissions.user'),
                    { auth: ctx.state.auth },
                ),
            };
            return;
        }
        const settings = await strapi
            .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
            .get();
        const role = await strapi.db
            .query('plugin::users-permissions.role')
            .findOne({ where: { type: settings.default_role } });
        user = await strapi.service('plugin::users-permissions.user').add({
            username: attrs.username,
            email: attrs.email,
            provider: 'GS',
            role: role.id,
            confirmed: true,
        });
        ctx.body = {
            jwt: await strapi.service('plugin::users-permissions.jwt').issue({ id: user.id }),
            user: await strapi.contentAPI.sanitize.output(
                user,
                strapi.getModel('plugin::users-permissions.user'),
                { auth: ctx.state.auth },
            ),
        };
    },
});
